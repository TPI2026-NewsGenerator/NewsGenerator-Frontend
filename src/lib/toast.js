//
//  Author: Fabian Rostello
//  Date: 28.09.2026
//  File: toast.js
//  Description: Short notes shown in a corner of the page for a few seconds, from anywhere
//

const DURATION = {info: 5000, success: 5000, error: 8000};

let notes = [];
let next = 0;
const listeners = new Set();

const emit = () => listeners.forEach(listener => listener());

export const dismiss = (id) => {
    notes = notes.filter(note => note.id !== id);
    emit();
};

// text: a string or an element; type: 'info', 'success' or 'error'
export const toast = (text, type = 'info') => {
    const id = ++next;
    notes = [...notes, {id, text, type}];
    emit();
    setTimeout(() => dismiss(id), DURATION[type] ?? DURATION.info);
    return id;
};

toast.success = (text) => toast(text, 'success');
toast.error = (text) => toast(text, 'error');

export const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const currentNotes = () => notes;
