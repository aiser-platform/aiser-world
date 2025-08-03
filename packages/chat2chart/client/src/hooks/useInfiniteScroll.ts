import { useEffect, useRef } from 'react';

interface UseInfiniteScrollProps<T> {
    loading: boolean;
    hasMore: boolean;
    onFetch: (offset: number) => void;
    currentItems: T[];
}

export const useInfiniteScroll = <T>({
    loading,
    hasMore,
    onFetch,
    currentItems,
}: UseInfiniteScrollProps<T>) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (
            !loading &&
            hasMore &&
            (scrollTop + clientHeight) / scrollHeight > 0.8
        ) {
            onFetch(currentItems.length);
        }
    };

    useEffect(() => {
        if (containerRef.current) {
            const { scrollHeight, clientHeight } = containerRef.current;
            if (!loading && hasMore && scrollHeight <= clientHeight) {
                onFetch(currentItems.length);
            }
        }
    }, [currentItems, loading, hasMore, onFetch]);

    return { containerRef, handleScroll };
};
