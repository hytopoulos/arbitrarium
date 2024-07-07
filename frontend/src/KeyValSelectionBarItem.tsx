import React, { useEffect, useState } from 'react';

export interface Props {
    disabled: any;
    onClick: () => void;
    children: any;
}

export default function KeyValSelectionBarItem(props: Props) {
    return (
        <button
            onClick={props.onClick}
            className={props.disabled ? 'bg-slate-300' : 'bg-slate-200'}
        >
            {props.children}
        </button>
    );
}