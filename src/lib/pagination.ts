/**
 * Shared pagination constants — imported by the API route, the server-
 * rendered history page, and every test layer, so an eventual page-size
 * change cannot silently desynchronize assertions.
 */
export const TRANSACTIONS_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
