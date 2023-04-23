declare global {
    const tsvscode: {
        postMessage({type: string, value, any}): void;
        getstate: () => any;
        setState: (state: any) => void;
    };
}