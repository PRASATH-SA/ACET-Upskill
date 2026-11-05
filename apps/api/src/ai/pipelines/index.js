/**
 * Registers every AI pipeline with the job runner. Each pipeline module calls
 * registerPipeline(type, handler) when imported.
 */
import './ingest.js';
import './draftMap.js';
import './draftContent.js';
import './tagPyqs.js';
import './variants.js';
import './explain.js';
import './overview.js';
