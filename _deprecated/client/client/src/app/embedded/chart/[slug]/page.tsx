'use client';

import React from 'react';
import ChartRenderer from './components/ChartRenderer';
import { fetchApi } from '@/utils/api';

interface PageProps {
    params: {
        slug: string;
    };
}

// const API_URL = 'http://localhost:8000/charts';

const EmbeddedChart = ({ params }: PageProps) => {
    const [chartOption, setChartOption] = React.useState<string | null>(null);

    const fetchChartData = React.useCallback(async () => {
        if (!params.slug) return;

        try {
            await fetchApi(`charts/${params.slug}`).then((response) => {
                if (!response.ok) throw new Error('Failed to fetch chart data');

                response.json().then((data) => {
                    setChartOption(JSON.stringify(data.result, null, 2));
                });
            });
        } catch (err) {
            console.error('Error fetching chart data:', err);
        }
    }, [params.slug]);
    React.useEffect(() => {
        return () => {
            fetchChartData();
        };
    }, []);

    return (
        <div key={params.slug} className="EmbeddedChart">
            <div className="h-screen w-screen">
                {chartOption && (
                    <div className="flex flex-col justify-center h-full">
                        <ChartRenderer value={chartOption} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmbeddedChart;
