//
//  Author: Fabian Rostello
//  Date: 02.10.2026
//  File: sessionContext.js
//  Description: The session of the reader shared by the pages, {user, refresh, forget}, given by
//               AuthProvider (AuthContext.jsx)
//

import {createContext} from "react";

export const AuthContext = createContext(null);
