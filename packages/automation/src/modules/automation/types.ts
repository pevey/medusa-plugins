export type AutomationOptions = {
	/**
	 * Maximum allowed incoming webhook payload size.
	 * Accepts a number (bytes) or a string with a unit suffix: '50kb', '1mb', etc.
	 * Defaults to '100kb' when not set.
	 */
	maxPayloadSize?: string | number

	/**
	 * Maximum number of workflow iterations when a field mapping uses [] fan-out syntax.
	 * Defaults to 50. Set to 0 for no cap (use with caution).
	 */
	maxWorkflowIterations?: number
}
