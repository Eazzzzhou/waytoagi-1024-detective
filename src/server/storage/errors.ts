/** Safe public classification: never include JSONB contents, SQL or connection strings. */
export class StoredDataError extends Error {
  constructor() { super("Stored data failed contract or reference integrity validation"); this.name = "StoredDataError"; }
}

/** Missing and cross-investigation resources share one public response. */
export class ResourceNotFoundError extends Error {
  constructor() { super("Resource does not exist in this investigation"); this.name = "ResourceNotFoundError"; }
}
