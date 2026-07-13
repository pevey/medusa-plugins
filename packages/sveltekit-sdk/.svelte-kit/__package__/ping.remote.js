import { query } from '$app/server';
export const getPing = query(async () => {
    return 'pong';
});
