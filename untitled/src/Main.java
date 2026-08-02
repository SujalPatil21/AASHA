public class Main {
    public static void main(String[] args) throws Exception {

        Heap<Integer> heap = new Heap<>();

        heap.insert(10);
        heap.insert(4);
        heap.insert(15);
        heap.insert(20);
        heap.insert(0);
        heap.insert(8);
        heap.insert(2);

        System.out.println("Sorted Array: " + heap.heapSort());
    }
}