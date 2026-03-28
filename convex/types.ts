import schema from "./schema"

import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  GenericMutationCtx,
  GenericQueryCtx,
  TableNamesInDataModel,
  WithoutSystemFields,
} from "convex/server"

export type DataModel = DataModelFromSchemaDefinition<typeof schema>
export type QueryCtx = GenericQueryCtx<DataModel>
export type MutationCtx = GenericMutationCtx<DataModel>
export type ReadCtx = QueryCtx | MutationCtx
export type TableName = TableNamesInDataModel<DataModel>

export type Doc<Table extends TableName> = DocumentByName<DataModel, Table>
export type Id<Table extends TableName> = Doc<Table>["_id"]
export type Insert<Table extends TableName> = WithoutSystemFields<Doc<Table>>
