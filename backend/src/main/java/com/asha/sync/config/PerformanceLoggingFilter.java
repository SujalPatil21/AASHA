package com.asha.sync.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class PerformanceLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(PerformanceLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        String path = httpRequest.getRequestURI();

        // Only log api operations to limit performance logging overhead
        if (!path.startsWith("/api") && !path.startsWith("/records") && !path.startsWith("/sync")) {
            chain.doFilter(request, response);
            return;
        }

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            String message = String.format("API REQUEST: %s %s took %dms (Status: %d)",
                    httpRequest.getMethod(), path, duration, httpResponse.getStatus());
            
            if (duration >= 500) {
                logger.warn("SLOW " + message);
            } else {
                logger.info(message);
            }
        }
    }
}
