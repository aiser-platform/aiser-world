import React from 'react';
import { ExtendedTable } from '../../types';
import FileSection from './FileSection';
import './styles.css';
import { IFileUpload } from '@/app/components/FileUpload/types';

interface Props {
    db?: unknown;
    schema?: string;
    tables?: Array<unknown>;
    file?: IFileUpload;
    getDbList?: (arg0: unknown) => void;
    onDbChange?: (db: unknown) => void;
    onSchemaChange?: (schema?: string) => void;
    onTableSelectChange?: (tables: Array<ExtendedTable>) => void;
    onCustomAIModelChange?: (model: string) => void;
    onFileChange?: (file: IFileUpload) => void;
}

const DataPanel: React.FC<Props> = (props) => {
    //   const [selectedDb, setSelectedDb] = React.useState<
    //     DatabaseObject | undefined
    //   >(undefined);
    //   const [selectedSchema, setSelectedSchema] = React.useState<
    //     string | undefined
    //   >(undefined);
    //   const [selectedTables, setSelectedTables] = React.useState<
    //     string | string[] | undefined
    //   >([]);

    //   React.useEffect(() => {
    //     setSelectedDb(props.db);
    //   }, [props.db]);

    //   React.useEffect(() => {
    //     setSelectedSchema(props.schema);
    //   }, [props.schema]);

    //   React.useEffect(() => {
    //     setSelectedTables(props.tables?.map((table) => table.name));
    //   }, [props.tables]);

    //   const handleSchemaChange = (schema?: string) => {
    //     setSelectedSchema(schema);
    //     props.onSchemaChange?.(schema);
    //   };

    //   const handleDbChange = (db: DatabaseObject) => {
    //     handleSchemaChange(undefined);
    //     setSelectedDb(db);
    //     props.onDbChange?.(db);
    //   };

    return (
        <div className="DataPanel">
            <div className="DataHeader">
                <div className="DataTitle">Data Panel</div>
            </div>
            <div className="DataContent">
                <FileSection
                    value={props.file}
                    onChange={(file) => props.onFileChange?.(file!)}
                />
            </div>
            {/* <AiserDatabaseSelector
        db={selectedDb}
        schema={selectedSchema}
        onDbChange={handleDbChange}
        onSchemaChange={handleSchemaChange}
        getDbList={props!.getDbList!}
        mode="vertical"
      />
      <TableSelector
        database={selectedDb}
        schema={selectedSchema}
        tableSelectMode="multiple"
        onTableSelectChange={(table) => setSelectedTables(table)}
        onTablesMetadataChange={props.onTableSelectChange}
        tableValue={selectedTables}
        tablesMetadata={props.tables || []}
      /> */}
        </div>
    );
};

export default DataPanel;
