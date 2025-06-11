import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Helper function to retrieve Gerrit credentials from .gitcookies
export function getGerritCredentials(gerritServerUrl: string): { username: string; httpPassword: string } {
    const gitcookiesPath = path.join(os.homedir(), '.gitcookies');
    let targetHost: string;
    try {
        targetHost = new URL(gerritServerUrl).hostname;
    } catch (e) {
        throw new Error(`Invalid GERRIT_SERVER_URL format: ${gerritServerUrl}. Cannot parse hostname.`);
    }

    if (!fs.existsSync(gitcookiesPath)) {
        throw new Error(`Error: .gitcookies file not found at ${gitcookiesPath}.
Please ensure it exists and is configured for your Gerrit server.
Example line for ${targetHost}:
${targetHost}\tTRUE\t/\tTRUE\t<timestamp>\to\t<username>=<password>`);
    }

    const content = fs.readFileSync(gitcookiesPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.startsWith('#') || line.trim() === '') {
            continue; // Skip comments and empty lines
        }

        const parts = line.split('\t');
        // A valid .gitcookies line for 'o' cookie should have 7 tab-separated fields
        if (parts.length !== 7) {
            continue;
        }

        const domainInCookie = parts[0];
        const cookieName = parts[5];
        const cookieValue = parts[6];

        const hostMatches = (domainInCookie.startsWith('.') && (targetHost.endsWith(domainInCookie) || targetHost === domainInCookie.substring(1))) ||
                            (!domainInCookie.startsWith('.') && targetHost === domainInCookie);

        if (hostMatches && cookieName === 'o') {
            const [username, password] = cookieValue.split('=', 2);
            if (username && password) {
                return { username, httpPassword: password };
            }
        }
    }

    throw new Error(`Credentials for ${targetHost} (from ${gerritServerUrl}) not found in ${gitcookiesPath} with cookie name 'o'.
Ensure a line exists like: ${targetHost}\tTRUE\t/\tTRUE\t<timestamp>\to\t<username>=<password>`);
}
