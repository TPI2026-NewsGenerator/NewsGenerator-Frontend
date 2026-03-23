// Fetch
const API_URL = import.meta.env.VITE_API_URL;

export const Fetch = {
    News: async (query) => {
        const response = await fetch(`${API_URL}/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query),
        });

        return await response.json();
    }
}
