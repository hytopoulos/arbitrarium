import React, { useEffect, useState } from 'react';
import KeyValSelectionBarItem from './KeyValSelectionBarItem.tsx';

export interface Props {
    title: string;
    items: any;
    selected: any;
    onItemSelected: (item: any) => void;
    display: (item: any) => string;
    k: (item: any) => any;
    v: (item: any) => any;
}

export default function KeyValSelectionBar(props: Props) {
    return (
        <div className='w-full bg-slate-200'>
            <p className='text-4xl'>{props.title}</p>
            <div className='flex flex-col divide-y divide-black divide-solid'>
            {props.items.map((item, _) => (
                <KeyValSelectionBarItem
                    onClick={() => props.onItemSelected(props.v(item))}
                    disabled={props.selected && props.k(props.selected) === props.k(item)}
                >
                    {props.display(item)}
                </KeyValSelectionBarItem>
            ))}
            </div>
        </div>
    );
}
