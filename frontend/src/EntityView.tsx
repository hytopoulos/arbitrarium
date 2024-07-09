import React from 'react';

export default function EntityView() {
    return (
        <>
            <div className="px-4 py-4 h-full w-full bg-slate-100 items-start">
                <div className="pb-4 font-bold text-xl">Jury</div>
                <div className="">
                    <p>Persuade [speaker=Player, addressee=Jury, content=Verdict, degree=0.1] </p>
                    <p>Capability [degree=0.5, event=Verdict] </p>
                </div>
            </div>
        </>
    );
}
