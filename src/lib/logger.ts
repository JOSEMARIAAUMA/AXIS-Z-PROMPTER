/**
 * Centralized logger for AXIS-Z PROMPTER.
 * Handles production error reporting and development logging.
 */

const IS_PROD = import.meta.env.PROD;

export const logger = {
    info: (message: string, data?: any) => {
        if (!IS_PROD) {
            console.log(`[INFO] [${new Date().toISOString()}] ${message}`, data || '');
        }
    },

    warn: (message: string, data?: any) => {
        console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, data || '');
        // In production, you might send this to a service like Logflare or Sentry
    },

    error: (message: string, error?: any, context?: any) => {
        console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, {
            error,
            context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        });

        if (IS_PROD) {
            // TODO: Integrate with Sentry, LogRocket, or a custom Supabase logging table
            // e.g., await supabase.from('logs').insert({ type: 'error', message, ... })
        }
    }
};
