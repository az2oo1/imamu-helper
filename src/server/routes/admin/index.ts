import express from 'express';
import { createAdminLogsRouter } from './adminLogs';
import { createAdminToolsRouter } from './adminTools';
import { createAdminResourcesRouter } from './adminResources';
import { createAdminAcademicRouter } from './adminAcademic';
import { createAdminNewsRouter } from './adminNews';
import { createAdminFeedbackRouter } from './adminFeedback';
import { createAdminContributorsRouter } from './adminContributors';
import { createAdminSystemRouter } from './adminSystem';
import { createAdminUsersRouter } from './adminUsers';

export function createAdminRouter(db: any) {
  const router = express.Router();

  // Mount domain-specific admin sub-routers
  router.use(createAdminLogsRouter(db));
  router.use(createAdminToolsRouter(db));
  router.use(createAdminResourcesRouter(db));
  router.use(createAdminAcademicRouter(db));
  router.use(createAdminNewsRouter(db));
  router.use(createAdminFeedbackRouter(db));
  router.use(createAdminContributorsRouter(db));
  router.use(createAdminSystemRouter(db));
  router.use(createAdminUsersRouter(db));

  return router;
}

export * from './common';
