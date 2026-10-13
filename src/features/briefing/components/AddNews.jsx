//
//  Author: Fabian Rostello
//  Date: 13.10.2026
//  File: AddNews.jsx
//  Description: A news the reader adds to the briefing by its link, to send it by e-mail with the cards:
//               the server reads its page and chooses its key passages as for a card
//

import {useState} from "react";
import {Button} from "@/components/ui/button.jsx";
import {Help, Input, Label} from "@/components/ui/field.jsx";

// onAdd(url) answers once the server did, true when the news was added: the field is emptied then
export const AddNews = ({onAdd}) => {
    const [url, setUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const valid = /^https?:\/\/\S+\.\S+/i.test(url.trim());

    const add = async () => {
        if (!valid || adding) return;
        setAdding(true);
        try {
            if (await onAdd(url.trim())) setUrl('');
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="max-w-[32ch]">
            <Label htmlFor="add-news">Add a news by its link</Label>
            <div className="mt-2 flex gap-2">
                <Input id="add-news" type="url" value={url} placeholder="https://…" disabled={adding}
                       onChange={event => setUrl(event.target.value)}
                       onKeyDown={event => {
                           if (event.key === 'Enter') {
                               event.preventDefault();
                               add();
                           }
                       }}/>
                <Button onClick={add} loading={adding} disabled={!valid || adding}>Add</Button>
            </div>
            <Help>{adding ? 'Reading the page and choosing its key passages…' : 'Read and added at the end of the briefing, ticked for the e-mail.'}</Help>
        </div>
    );
};
