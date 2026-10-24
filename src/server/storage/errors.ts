/** Safe public classification: never include JSONB contents, SQL or connection strings. */
export class StoredDataError extends Error {
  constructor() { super("Stored data failed contract or reference integrity validation"); this.name = "StoredDataError"; }
}
