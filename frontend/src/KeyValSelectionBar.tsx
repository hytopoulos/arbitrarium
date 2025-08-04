import React, { ReactNode } from 'react';
import KeyValSelectionBarItem from './KeyValSelectionBarItem';

export interface Props<T, K, V> {
    title: string;
    items: T[];
    selected: T | null;
    onItemSelected: (value: V) => void;
    display: (item: T) => ReactNode;
    k: (item: T) => K;  // Key extractor for comparison
    v: (item: T) => V;  // Value extractor for selection
}

export default function KeyValSelectionBar<T, K, V>({
    title,
    items,
    selected,
    onItemSelected,
    display,
    k,
    v,
}: Props<T, K, V>) {
    return (
        <div className='w-full bg-slate-200'>
            <p className='text-4xl'>{title}</p>
            <div className='flex flex-col divide-y divide-black divide-solid'>
                {items.map((item, index) => {
                    const keyValue = k(item);
                    // Ensure key is a string and not undefined
                    const safeKey = keyValue !== undefined ? String(keyValue) : `item-${index}`;
                    
                    // Log a warning if we detect a potential duplicate key
                    if (items.findIndex(i => k(i) === keyValue) !== index) {
                        console.warn(`Duplicate key detected for item:`, item);
                    }
                    
                    return (
                        <KeyValSelectionBarItem
                            key={safeKey}
                            onClick={() => onItemSelected(v(item))}
                            disabled={selected !== null && k(selected) === k(item)}
                        >
                            {display(item)}
                        </KeyValSelectionBarItem>
                    );
                })}
            </div>
        </div>
    );
}
