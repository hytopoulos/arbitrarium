import React, { useEffect, useState } from 'react';
import KeyValSelectionBarItem from './KeyValSelectionBarItem.tsx';

export interface Props {
    title: string;
    items: any;
    onItemSelected: (item: any) => void;
    display: (item: any) => string;
    k: (item: any) => any;
    v: (item: any) => any;
}

export default function KeyValSelectionBar(props: Props) {
    const [selected, setSelected] = useState(null);

    const onClick = (item) => {
        setSelected(item);
        props.onItemSelected(item);
    }

    return (
        <div className='h-full w-full bg-slate-200'>
            <p className='text-4xl'>{props.title}</p>
            <div className='flex flex-col'>
            {props.items.map((item, _) => (
                <KeyValSelectionBarItem
                    onClick={() => onClick(item)}
                    disabled={selected && props.k(selected) === props.k(item)}
                >
                    {props.display(item)}
                </KeyValSelectionBarItem>
            ))}
            </div>
        </div>
    );
}
