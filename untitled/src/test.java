import java.io.*;
import java.util.*;
public class test {

    public static void main(String[] args) throws IOException {

        Scanner sc = new Scanner(System.in);

        int t1 = sc.nextInt();

        while(t1 > 0){
            t1--;

            int n = sc.nextInt();
            int X = sc.nextInt();
            int index = 0;
            int[] nums = new int[n];
            for(int i = 0 ; i < n ; i++){

                nums[i] = sc.nextInt();
                if(X == nums[i]){
                    index = i;
                }
            }

            for(int i = index ; i < 0 ; i--){

                if(Math.abs(nums[i- 1] - nums[index] ) == 1 ){
                    int temp = nums[i-1];
                    nums[i-1] = nums[index];
                    nums[index]= temp;
                    index = i -1 ;
                }
            }
            if(nums[0] == X){
                System.out.println("YES");
            }
            else{
                System.out.println("NO");
            }
        }
    }
}