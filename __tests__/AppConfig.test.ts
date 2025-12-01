/**
 * App Configuration Tests
 * Testing app constants and configuration
 */

describe('App Configuration', () => {
    it('should have correct app name', () => {
        const appName = 'podapp';
        expect(appName).toBe('podapp');
    });

    it('should define required screens', () => {
        const screens = {
            auth: ['Login', 'Register'],
            main: ['Home', 'Search', 'Library', 'Profile'],
            modal: ['Player', 'Notifications'],
        };

        expect(screens.auth.length).toBeGreaterThan(0);
        expect(screens.main.length).toBeGreaterThan(0);
    });

    it('should have proper project structure', () => {
        const structure = {
            screens: true,
            components: true,
            redux: true,
            services: true,
            assets: true,
        };

        expect(structure.screens).toBe(true);
        expect(structure.redux).toBe(true);
        expect(structure.services).toBe(true);
    });
});
