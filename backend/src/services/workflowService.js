const { pool: db } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get workflow steps for a pass type
 * @param {Object} connection - Database connection (optional, uses pool if not provided)
 * @param {Number} passTypeId - Pass type ID
 * @returns {Array} Workflow steps ordered by step_order
 */
const getWorkflowSteps = async (connection, passTypeId) => {
    try {
        // Use provided connection or pool
        const dbConnection = connection || db;

        const [steps] = await dbConnection.query(
            `SELECT id, pass_type_id, step_order, approver_role, is_mandatory
             FROM pass_type_workflow_steps
             WHERE pass_type_id = ?
             ORDER BY step_order ASC`,
            [passTypeId]
        );
        return steps;
    } catch (error) {
        logger.error('Error fetching workflow steps:', error);
        throw error;
    }
};

/**
 * Create approval records for a pass based on workflow
 * @param {Object} connection - Database connection (required for transaction)
 * @param {Number} passId - Pass ID
 * @param {Number} passTypeId - Pass type ID
 * @param {Number} studentId - Student ID (needed to find class coordinator)
 * @returns {Number} Total approval steps created
 */
const createApprovalWorkflow = async (connection, passId, passTypeId, studentId) => {
    try {
        logger.info(`Creating approval workflow for pass ${passId}, pass type ${passTypeId}`);

        // Get workflow steps using the same connection
        const steps = await getWorkflowSteps(connection, passTypeId);

        if (steps.length === 0) {
            throw new Error(`No workflow steps found for pass type ${passTypeId}`);
        }

        // Get class coordinator for this student (needed for CLASS_COORDINATOR step)
        let coordinatorId = null;
        if (studentId) {
            const [studentRows] = await connection.query(
                `SELECT assigned_coordinator_id, branch, year FROM students WHERE id = ?`,
                [studentId]
            );
            
            if (studentRows.length > 0) {
                coordinatorId = studentRows[0].assigned_coordinator_id;
                
                // Fallback: If not assigned, try to find matching coordinator by department only
                if (!coordinatorId) {
                    const [coordinators] = await connection.query(
                        `SELECT id FROM coordinators 
                         WHERE department = ?`,
                        [studentRows[0].branch]
                    );
                    
                    if (coordinators.length > 0) {
                        if (coordinators.length > 1) {
                            logger.warn(`Multiple coordinators found for department ${studentRows[0].branch}. Using the first one (ID: ${coordinators[0].id})`);
                        }
                        coordinatorId = coordinators[0].id;
                        // Proactively update student record for future passes
                        await connection.query(
                            `UPDATE students SET assigned_coordinator_id = ? WHERE id = ?`,
                            [coordinatorId, studentId]
                        );
                        logger.info(`Auto-assigned coordinator ${coordinatorId} to student ${studentId} during workflow creation`);
                    }
                }
            }
        }

        // Create approval records for each step using the same connection
        for (const step of steps) {
            let approverId = null;

            if (step.approver_role === 'CLASS_COORDINATOR') {
                approverId = coordinatorId;
            } else {
                // Find first active user with this role
                const [users] = await connection.query(
                    `SELECT id FROM users WHERE role = ? AND status = 'ACTIVE' LIMIT 1`,
                    [step.approver_role]
                );
                approverId = users.length > 0 ? users[0].id : null;
            }

            await connection.query(
                `INSERT INTO pass_approvals (
                    pass_id, step_order, approver_role, approver_id, status, created_at
                ) VALUES (?, ?, ?, ?, 'PENDING', NOW())`,
                [passId, step.step_order, step.approver_role, approverId]
            );

            logger.info(`Created approval step ${step.step_order} (${step.approver_role}) with approver_id=${approverId} for pass ${passId}`);
        }

        logger.info(`Created ${steps.length} approval steps for pass ${passId}`);
        return steps.length;

    } catch (error) {
        logger.error('Error creating approval workflow:', error);
        throw error;
    }
};

/**
 * Get the first approver role for a pass type
 * @param {Number} passTypeId - Pass type ID
 * @returns {String} First approver role
 */
const getFirstApproverRole = async (passTypeId) => {
    try {
        const [steps] = await db.query(
            `SELECT approver_role
             FROM pass_type_workflow_steps
             WHERE pass_type_id = ? AND step_order = 1`,
            [passTypeId]
        );

        if (steps.length === 0) {
            throw new Error(`No workflow steps found for pass type ${passTypeId}`);
        }

        return steps[0].approver_role;
    } catch (error) {
        logger.error('Error fetching first approver:', error);
        throw error;
    }
};

/**
 * Get coordinator for a student's class
 * @param {Number} studentId - Student ID
 * @returns {Number|null} Coordinator user ID
 */
const getStudentCoordinator = async (studentId) => {
    try {
        const [result] = await db.query(
            `SELECT assigned_coordinator_id FROM students WHERE id = ?`,
            [studentId]
        );

        return result.length > 0 ? result[0].assigned_coordinator_id : null;
    } catch (error) {
        logger.error('Error fetching student coordinator:', error);
        throw error;
    }
};

module.exports = {
    getWorkflowSteps,
    createApprovalWorkflow,
    getFirstApproverRole,
    getStudentCoordinator
};
