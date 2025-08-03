'use client';

import { Col, Row } from 'antd';
import React from 'react';
import ChatPanel from './components/ChatPanel/ChatPanel';
import DataPanel from './components/DataPanel/DataPanel';
import ChatHistoryPanel from './components/HistoryPanel/HistoryPanel';
import { ExtendedTable, IConversation, IDatabase } from './types';
import { IFileUpload } from '@/app/components/FileUpload/types';

const ChatToChart = () => {
    const [conversationState, setConversationState] = React.useState<
        IConversation | undefined
    >(undefined);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [dbList, setDbList] = React.useState<IDatabase[]>([]);
    const [db, setDb] = React.useState<IDatabase | undefined>(undefined);
    const [schema, setSchema] = React.useState<string | undefined>(undefined);
    const [tables, setTables] = React.useState<ExtendedTable[] | undefined>(
        undefined
    );
    const [file, setFile] = React.useState<IFileUpload | undefined>(undefined);
    const [openAIModel, setOpenAIModel] = React.useState<string | undefined>(
        undefined
    );

    return (
        <div className="ChatToChart">
            <div
                style={{
                    width: '100%',
                    height: '100%',
                }}
            >
                <Row
                    gutter={[4, 4]}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <Col span={5}>
                        <ChatHistoryPanel
                            id={conversationState?.id || ''}
                            current={conversationState!}
                            onClick={(props: IConversation) => {
                                setConversationState(props);
                                setDb(undefined);
                                setSchema(undefined);
                                setTables(undefined);
                            }}
                        />
                    </Col>
                    <Col span={14}>
                        <ChatPanel
                            id={conversationState?.id || ''}
                            file={file}
                            db={db}
                            schema={schema}
                            tables={tables}
                            customAIModel={openAIModel}
                            onDefaultDbChange={(ddb?: IDatabase) => {
                                const defaultDb = dbList.find(
                                    (db) => db.id === ddb?.id
                                );
                                setDb(defaultDb);
                            }}
                            onDefaultSchemaChange={setSchema}
                            onDefaultTablesChange={setTables}
                            callback={(props: {
                                conversation: IConversation;
                            }) => {
                                setConversationState(props.conversation);
                            }}
                            onFileChange={(file) => {
                                setFile(file);
                            }}
                        />
                    </Col>
                    <Col span={5}>
                        <DataPanel
                            db={db}
                            schema={schema}
                            tables={tables}
                            file={file}
                            onSchemaChange={setSchema}
                            onTableSelectChange={setTables}
                            onCustomAIModelChange={setOpenAIModel}
                            onFileChange={(file) => {
                                setFile(file);
                            }}
                        />
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default ChatToChart;
