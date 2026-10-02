//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: session.jsx
//  Description: The session of a page under test, given as the AuthProvider would once the server
//               answered (see src/features/auth/AuthContext.jsx)
//

import {vi} from 'vitest';
import {AuthContext} from '@/features/auth/sessionContext.js';

// user: the signed in reader, null when nobody is
export const WithSession = ({user = null, refresh = vi.fn(async () => user), forget = vi.fn(async () => {}), children}) => (
    <AuthContext.Provider value={{user, refresh, forget}}>{children}</AuthContext.Provider>
);
