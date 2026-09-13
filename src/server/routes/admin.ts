/**
 * Admin Router Modular Aggregator
 * Decomposed into modular domain routers under ./admin/
 */
export { createAdminRouter, checkAdmin, uploadStorage } from './admin/index';
export default createAdminRouter;
import { createAdminRouter } from './admin/index';
