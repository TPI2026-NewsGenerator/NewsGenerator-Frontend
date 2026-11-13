//
//  Author: Fabian Rostello
//  Date: 12.11.2026
//  File: useRemote.js
//  Description: A call of the API as a state of the page: loading, ready with its data, or failed with what to say. Asked again by
//               reload(). An answer that carries {error} (a refusal, a page of the tunnel) is a failure
//

import {useCallback, useEffect, useState} from "react";

export const useRemote = (load) => {
    const [state, setState] = useState({status: 'loading', data: null, error: null});
    const [round, setRound] = useState(0);

    useEffect(() => {
        let current = true;
        Promise.resolve()
            .then(load)
            .then(data => {
                if (!current) return;
                if (!data || data.error) setState({status: 'error', data: null, error: data?.error ?? 'The server sent nothing.'});
                else setState({status: 'ready', data, error: null});
            })
            .catch(error => { if (current) setState({status: 'error', data: null, error: error?.message ?? 'The server did not answer.'}); });
        return () => { current = false; };
    }, [load, round]);

    // asked again: the page says so at once, then the answer comes
    const reload = useCallback(() => {
        setState(previous => ({...previous, status: 'loading'}));
        setRound(one => one + 1);
    }, []);
    // Asked again without the page going back to "loading": what is shown stays until the new answer comes, and stays when it fails.
    // Resolves {ok: true} or {error}
    const refresh = useCallback(async () => {
        try {
            const data = await load();
            if (!data || data.error) return {error: data?.error ?? 'The server sent nothing.'};
            setState({status: 'ready', data, error: null});
            return {ok: true};
        } catch (error) {
            return {error: error?.message ?? 'The server did not answer.'};
        }
    }, [load]);

    return {...state, reload, refresh};
};
