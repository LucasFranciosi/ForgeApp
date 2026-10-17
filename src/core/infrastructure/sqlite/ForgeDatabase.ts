import * as SQLite from 'expo-sqlite';

let connection: SQLite.SQLiteDatabase | null = null;
export async function forgeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!connection) { connection = await SQLite.openDatabaseAsync('forge.db'); await migrate(connection); }
  return connection;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS schemaMigration (version INTEGER PRIMARY KEY);');
  const applied = await db.getAllAsync<{ version: number }>('SELECT version FROM schemaMigration ORDER BY version');
  const has = (version: number) => applied.some(row => row.version === version);

  if (!has(1)) {
    await db.withTransactionAsync(async () => {
      await applyInitialSchema(db);
      await db.runAsync('INSERT OR IGNORE INTO schemaMigration(version) VALUES (?)', 1);
    });
  }

  if (!has(2)) {
    await db.withTransactionAsync(async () => {
      // SQLite ALTER TABLE is additive: records created by earlier Forge builds stay intact.
      await addColumnIfMissing(db, 'machine', 'sectorId TEXT');
      await addColumnIfMissing(db, 'technicalDocument', 'fileHash TEXT');
      await addColumnIfMissing(db, 'technicalDocument', 'fileAuditStatus TEXT NOT NULL DEFAULT \'present\'');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS machineThreeDModel (
          id TEXT PRIMARY KEY, machineId TEXT NOT NULL, localUri TEXT NOT NULL, fileName TEXT, fileSize INTEGER,
          fileHash TEXT, status TEXT NOT NULL CHECK(status IN ('pending','available','missing','failed')),
          createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY(machineId) REFERENCES machine(id)
        );
        CREATE TABLE IF NOT EXISTS machineThreeDNode (
          id TEXT PRIMARY KEY, modelId TEXT NOT NULL, componentId TEXT, nodeName TEXT NOT NULL,
          FOREIGN KEY(modelId) REFERENCES machineThreeDModel(id), FOREIGN KEY(componentId) REFERENCES machineComponent(id)
        );
        CREATE INDEX IF NOT EXISTS ixThreeDModelMachine ON machineThreeDModel(machineId, updatedAt DESC);
      `);
      await db.runAsync('INSERT OR IGNORE INTO schemaMigration(version) VALUES (?)', 2);
    });
  }

  if (!has(3)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS findingEvidence (
          id TEXT PRIMARY KEY, findingId TEXT NOT NULL, documentId TEXT, localUri TEXT,
          evidenceType TEXT NOT NULL, caption TEXT, createdAt TEXT NOT NULL,
          FOREIGN KEY(findingId) REFERENCES maintenanceFinding(id), FOREIGN KEY(documentId) REFERENCES technicalDocument(id)
        );
        CREATE TABLE IF NOT EXISTS findingHistory (
          id INTEGER PRIMARY KEY AUTOINCREMENT, findingId TEXT NOT NULL, eventType TEXT NOT NULL,
          notes TEXT, occurredAt TEXT NOT NULL, actorId TEXT NOT NULL DEFAULT 'local-operator',
          FOREIGN KEY(findingId) REFERENCES maintenanceFinding(id)
        );
        CREATE INDEX IF NOT EXISTS ixFindingEvidenceFinding ON findingEvidence(findingId, createdAt DESC);
        CREATE INDEX IF NOT EXISTS ixFindingHistoryFinding ON findingHistory(findingId, occurredAt DESC);
      `);
      await db.runAsync('INSERT OR IGNORE INTO schemaMigration(version) VALUES (?)', 3);
    });
  }

  if (!has(4)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS machineWorkShift (
          id TEXT PRIMARY KEY, machineId TEXT NOT NULL, effectiveFrom TEXT NOT NULL, effectiveTo TEXT,
          weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6), startsAtLocal TEXT NOT NULL, endsAtLocal TEXT NOT NULL,
          crossesMidnight INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY(machineId) REFERENCES machine(id), CHECK(startsAtLocal <> endsAtLocal)
        );
        CREATE INDEX IF NOT EXISTS ixMachineWorkShift ON machineWorkShift(machineId, effectiveFrom, weekday);
      `);
      await db.runAsync('INSERT OR IGNORE INTO schemaMigration(version) VALUES (?)', 4);
    });
  }

  if (!has(5)) {
    await db.withTransactionAsync(async () => {
      // Additive operational records.  These tables intentionally do not alter
      // existing business rows, so databases created by earlier APKs remain valid.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS workOrderEvidence (
          id TEXT PRIMARY KEY, workOrderId TEXT NOT NULL, evidenceType TEXT NOT NULL CHECK(evidenceType IN ('photo','signature')),
          localUri TEXT NOT NULL, fileHash TEXT, createdAt TEXT NOT NULL, actorId TEXT NOT NULL DEFAULT 'local-operator',
          FOREIGN KEY(workOrderId) REFERENCES workOrder(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS telemetryReading (
          id TEXT PRIMARY KEY, machineId TEXT NOT NULL, metric TEXT NOT NULL CHECK(metric IN ('vibration','temperature','current')),
          value REAL NOT NULL, unit TEXT NOT NULL, measuredAt TEXT NOT NULL, notes TEXT, createdAt TEXT NOT NULL,
          FOREIGN KEY(machineId) REFERENCES machine(id)
        );
        CREATE TABLE IF NOT EXISTS localRagJob (
          id TEXT PRIMARY KEY, documentId TEXT NOT NULL, jobType TEXT NOT NULL CHECK(jobType IN ('chunk','embedding')),
          status TEXT NOT NULL CHECK(status IN ('pending','processing','completed','failed')),
          error TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
          FOREIGN KEY(documentId) REFERENCES technicalDocument(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS ixWorkOrderEvidenceOrder ON workOrderEvidence(workOrderId, createdAt);
        CREATE INDEX IF NOT EXISTS ixTelemetryMachineMetric ON telemetryReading(machineId, metric, measuredAt DESC);
        CREATE INDEX IF NOT EXISTS ixRagJobStatus ON localRagJob(status, updatedAt);
      `);
      await db.runAsync('INSERT OR IGNORE INTO schemaMigration(version) VALUES (?)', 5);
    });
  }

  if (!has(6)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS ixWorkOrderSchedule ON workOrder(machineId, scheduledAt);
        CREATE INDEX IF NOT EXISTS ixDowntimeWorkOrder ON machineDowntime(workOrderId);
        CREATE INDEX IF NOT EXISTS ixShiftEffective ON machineWorkShift(machineId, weekday, effectiveFrom);
      `);
      await db.runAsync('INSERT OR IGNORE INTO schemaMigration(version) VALUES (?)', 6);
    });
  }
}

async function addColumnIfMissing(db: SQLite.SQLiteDatabase, table: string, definition: string): Promise<void> {
  const column = definition.trim().split(/\s+/)[0];
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some(item => item.name === column)) await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

async function applyInitialSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schemaMigration (version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS plant (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL CHECK(status IN ('active','inactive')),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS plantSector (
      id TEXT PRIMARY KEY, plantId TEXT NOT NULL, parentSectorId TEXT, name TEXT NOT NULL, description TEXT, sortOrder INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('active','inactive')), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(plantId) REFERENCES plant(id), FOREIGN KEY(parentSectorId) REFERENCES plantSector(id)
    );
    CREATE TABLE IF NOT EXISTS machine (
      id TEXT PRIMARY KEY, plantId TEXT NOT NULL, sectorName TEXT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      description TEXT, manufacturer TEXT, model TEXT, serialNumber TEXT, machineType TEXT,
      lifecycleStatus TEXT NOT NULL CHECK(lifecycleStatus IN ('active','inactive','decommissioned')),
      operationalStatus TEXT NOT NULL CHECK(operationalStatus IN ('running','stopped','setup','maintenance','fault')),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS machineComponent (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, parentComponentId TEXT, code TEXT, name TEXT NOT NULL,
      componentType TEXT, description TEXT, discipline TEXT NOT NULL CHECK(discipline IN ('mechanical','electrical','mixed')),
      isCritical INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(machineId) REFERENCES machine(id),
      FOREIGN KEY(parentComponentId) REFERENCES machineComponent(id)
    );
    CREATE TABLE IF NOT EXISTS machineDowntime (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, workOrderId TEXT, type TEXT NOT NULL CHECK(type IN ('planned','unplanned')),
      reason TEXT, startedAt TEXT NOT NULL, endedAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(machineId) REFERENCES machine(id), CHECK(endedAt IS NULL OR endedAt > startedAt)
    );
    CREATE TABLE IF NOT EXISTS machineHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT, machineId TEXT NOT NULL, eventType TEXT NOT NULL, occurredAt TEXT NOT NULL,
      previousStatus TEXT, nextStatus TEXT, reason TEXT, FOREIGN KEY(machineId) REFERENCES machine(id)
    );
    CREATE TABLE IF NOT EXISTS machineWorkSchedule (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, effectiveFrom TEXT NOT NULL, effectiveTo TEXT,
      mondayMinutes INTEGER NOT NULL, tuesdayMinutes INTEGER NOT NULL, wednesdayMinutes INTEGER NOT NULL, thursdayMinutes INTEGER NOT NULL,
      fridayMinutes INTEGER NOT NULL, saturdayMinutes INTEGER NOT NULL, sundayMinutes INTEGER NOT NULL,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(machineId) REFERENCES machine(id), CHECK(effectiveTo IS NULL OR effectiveTo >= effectiveFrom)
    );
    CREATE TABLE IF NOT EXISTS machineScheduleException (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, startsAt TEXT NOT NULL, endsAt TEXT NOT NULL, type TEXT NOT NULL,
      plannedMinutes INTEGER, reason TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY(machineId) REFERENCES machine(id), CHECK(endsAt > startsAt)
    );
    CREATE TABLE IF NOT EXISTS machineOperationPeriod (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, startedAt TEXT NOT NULL, endedAt TEXT, type TEXT NOT NULL, notes TEXT, createdAt TEXT NOT NULL,
      FOREIGN KEY(machineId) REFERENCES machine(id), CHECK(endedAt IS NULL OR endedAt > startedAt)
    );
    CREATE TABLE IF NOT EXISTS machineDailyPerformance (
      machineId TEXT NOT NULL, performanceDate TEXT NOT NULL, plannedMinutes REAL NOT NULL, availablePlannedMinutes REAL NOT NULL,
      operatingMinutes REAL NOT NULL, productiveMinutes REAL NOT NULL, plannedDowntimeMinutes REAL NOT NULL, unplannedDowntimeMinutes REAL NOT NULL,
      extraMinutes REAL NOT NULL, efficiencyPercent REAL, availabilityPercent REAL, calculationVersion INTEGER NOT NULL, calculatedAt TEXT NOT NULL,
      PRIMARY KEY(machineId, performanceDate), FOREIGN KEY(machineId) REFERENCES machine(id)
    );
    CREATE TABLE IF NOT EXISTS preventivePlan (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, name TEXT NOT NULL, description TEXT, frequencyType TEXT NOT NULL, frequencyValue INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active','inactive')), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(machineId) REFERENCES machine(id), CHECK(frequencyValue > 0)
    );
    CREATE TABLE IF NOT EXISTS preventiveSection (
      id TEXT PRIMARY KEY, planId TEXT NOT NULL, machineId TEXT NOT NULL, componentId TEXT, name TEXT NOT NULL, discipline TEXT NOT NULL,
      sequence INTEGER NOT NULL, isRequired INTEGER NOT NULL, estimatedMinutes INTEGER, FOREIGN KEY(planId) REFERENCES preventivePlan(id), FOREIGN KEY(machineId) REFERENCES machine(id), UNIQUE(planId, sequence)
    );
    CREATE TABLE IF NOT EXISTS preventiveSectionAction (
      id TEXT PRIMARY KEY, sectionId TEXT NOT NULL, description TEXT NOT NULL, instructions TEXT, isRequired INTEGER NOT NULL, sequence INTEGER NOT NULL,
      FOREIGN KEY(sectionId) REFERENCES preventiveSection(id), UNIQUE(sectionId, sequence)
    );
    CREATE TABLE IF NOT EXISTS preventiveExecution (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, planId TEXT NOT NULL, scheduledAt TEXT NOT NULL, status TEXT NOT NULL,
      startedAt TEXT, completedAt TEXT, cancelledAt TEXT, cancellationReason TEXT, version INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY(machineId) REFERENCES machine(id), FOREIGN KEY(planId) REFERENCES preventivePlan(id)
    );
    CREATE TABLE IF NOT EXISTS preventiveSectionExecution (
      id TEXT PRIMARY KEY, executionId TEXT NOT NULL, sectionId TEXT NOT NULL, isRequired INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT,
      FOREIGN KEY(executionId) REFERENCES preventiveExecution(id), FOREIGN KEY(sectionId) REFERENCES preventiveSection(id)
    );
    CREATE TABLE IF NOT EXISTS preventiveActionExecution (
      id TEXT PRIMARY KEY, sectionExecutionId TEXT NOT NULL, isRequired INTEGER NOT NULL, status TEXT NOT NULL, notes TEXT,
      FOREIGN KEY(sectionExecutionId) REFERENCES preventiveSectionExecution(id)
    );
    CREATE TABLE IF NOT EXISTS preventiveHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT, executionId TEXT NOT NULL, machineId TEXT NOT NULL, eventType TEXT NOT NULL, occurredAt TEXT NOT NULL, reason TEXT,
      FOREIGN KEY(executionId) REFERENCES preventiveExecution(id), FOREIGN KEY(machineId) REFERENCES machine(id)
    );
    CREATE TABLE IF NOT EXISTS maintenanceFinding (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, componentId TEXT, title TEXT NOT NULL, description TEXT,
      severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')), status TEXT NOT NULL CHECK(status IN ('open','convertedToWorkOrder','resolved','dismissed')),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, resolvedAt TEXT, resolutionNotes TEXT, workOrderId TEXT, version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(machineId) REFERENCES machine(id)
    );
    CREATE TABLE IF NOT EXISTS technicalDocument (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, componentId TEXT, title TEXT NOT NULL, documentType TEXT NOT NULL, discipline TEXT,
      localUri TEXT NOT NULL, mimeType TEXT, fileName TEXT, fileSize INTEGER, indexingStatus TEXT NOT NULL CHECK(indexingStatus IN ('pending','processing','indexed','failed')),
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, FOREIGN KEY(machineId) REFERENCES machine(id)
    );
    CREATE TABLE IF NOT EXISTS machineSla (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, effectiveFrom TEXT NOT NULL, effectiveTo TEXT,
      minimumAvailabilityPercent REAL, minimumEfficiencyPercent REAL, maximumDowntimeMinutes INTEGER, maximumUnplannedDowntimeMinutes INTEGER,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, FOREIGN KEY(machineId) REFERENCES machine(id), CHECK(effectiveTo IS NULL OR effectiveTo>=effectiveFrom)
    );
    CREATE TABLE IF NOT EXISTS localAiModel (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('llm','vision','embedding','whisper')),
      localPath TEXT, sizeBytes INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK(status IN ('absent','ready','failed')),
      updatedAt TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS workOrder (
      id TEXT PRIMARY KEY, machineId TEXT NOT NULL, componentId TEXT, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      description TEXT, type TEXT NOT NULL CHECK(type IN ('preventive','corrective','inspection')),
      discipline TEXT NOT NULL CHECK(discipline IN ('mechanical','electrical','mixed')),
      priority TEXT NOT NULL CHECK(priority IN ('low','normal','high','critical')),
      status TEXT NOT NULL CHECK(status IN ('open','scheduled','inProgress','paused','completed','cancelled')),
      scheduledAt TEXT, startedAt TEXT, pausedAt TEXT, completedAt TEXT, cancelledAt TEXT, closingNotes TEXT, cancellationReason TEXT,
      requiresPhoto INTEGER NOT NULL DEFAULT 0, requiresSignature INTEGER NOT NULL DEFAULT 0, hasPhoto INTEGER NOT NULL DEFAULT 0, hasSignature INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workOrderAction (
      id TEXT PRIMARY KEY, workOrderId TEXT NOT NULL, description TEXT NOT NULL, isRequired INTEGER NOT NULL, status TEXT NOT NULL,
      FOREIGN KEY(workOrderId) REFERENCES workOrder(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS domainHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT, aggregateType TEXT NOT NULL, aggregateId TEXT NOT NULL, machineId TEXT NOT NULL,
      eventType TEXT NOT NULL, occurredAt TEXT NOT NULL, reason TEXT
    );
    CREATE INDEX IF NOT EXISTS ixWorkOrderMachineStatus ON workOrder(machineId, status);
    CREATE INDEX IF NOT EXISTS ixPlantSectorPlantParent ON plantSector(plantId, parentSectorId);
    CREATE INDEX IF NOT EXISTS ixMachineComponentMachine ON machineComponent(machineId);
    CREATE INDEX IF NOT EXISTS ixMachineDowntime ON machineDowntime(machineId, startedAt);
    CREATE INDEX IF NOT EXISTS ixMachineHistory ON machineHistory(machineId, occurredAt DESC);
    CREATE INDEX IF NOT EXISTS ixMachineSchedule ON machineWorkSchedule(machineId, effectiveFrom);
    CREATE INDEX IF NOT EXISTS ixMachineOperationPeriod ON machineOperationPeriod(machineId, startedAt, endedAt);
    CREATE INDEX IF NOT EXISTS ixPreventiveExecutionMachineStatus ON preventiveExecution(machineId, status);
    CREATE INDEX IF NOT EXISTS ixFindingMachineStatus ON maintenanceFinding(machineId, status);
    CREATE INDEX IF NOT EXISTS ixTechnicalDocumentMachine ON technicalDocument(machineId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS ixMachineSla ON machineSla(machineId,effectiveFrom);
    CREATE INDEX IF NOT EXISTS ixDomainHistoryMachine ON domainHistory(machineId, occurredAt DESC);
  `);
}
