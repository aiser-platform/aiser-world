import { Spin } from 'antd';

const LoadingScreen = () => {
    return (
        <div className="flex justify-center items-center h-screen w-screen absolute top-0 left-0 bg-opacity-80 z-50">
            <Spin size="large" className="CustomSpinner" />
        </div>
    );
};

export default LoadingScreen;
