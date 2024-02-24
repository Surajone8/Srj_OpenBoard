import React, { useCallback, useEffect, useState } from 'react'
import LiveCursors from './cursor/LiveCursors'
import { useBroadcastEvent, useEventListener, useMyPresence, useOthers } from '@/liveblocks.config'
import CursorChat from './cursor/CursorChat'
import { CursorMode, CursorState, ReactionEvent } from '@/types/type'
import ReactionSelector from './reactions/ReactionButton'
import FlyingReaction from './reactions/FlyingReaction'
import useInterval from '@/hooks/useInterval'

type Props = {
    canvasRef: React.MutableRefObject<HTMLCanvasElement>;
}

const Live = ({ canvasRef }: Props) => {
    const others = useOthers();
    const [{ cursor }, updateMyPresence] = useMyPresence() as any;
    const [reactions, setReactions] = useState<Reaction[]>
        ([])
    const [cursorstate, setCursorState] = useState<CursorState>({ mode: CursorMode.Hidden, })


    const broadcast = useBroadcastEvent();

    useInterval(() => {
        setReactions((reactions) => reactions.filter((reaction) => reaction.timestamp > Date.now() - 4000))
    }, 1000)

    useInterval(() => {
        if (cursorstate.mode === CursorMode.Reaction && cursorstate.isPressed && cursor) {
            setReactions((reactions) => reactions.concat([{ point: { x: cursor.x, y: cursor.y }, timestamp: Date.now(), value: cursorstate.reaction }]))


            broadcast({
                x: cursor.x,
                y: cursor.y,
                value: cursorstate.reaction,
            })
        }
    }, 100);

    useEventListener((eventData) => {
        const event = eventData.event as ReactionEvent;
        setReactions((reactions) => reactions.concat([{ point: { x: event.x, y: event.y }, timestamp: Date.now(), value: event.value }]))
    })


    const handlePoinetrMove = useCallback((event: React.PointerEvent) => {
        event.preventDefault();

        if (cursor == null || cursorstate.mode !== CursorMode.ReactionSelector) {

            const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
            const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

            updateMyPresence({ cursor: { x, y } });
        }

    }, [])

    const handlePoinetrLeave = useCallback((event: React.PointerEvent) => {
        setCursorState({ mode: CursorMode.Hidden })

        updateMyPresence({ cursor: null, message: null });
    }, [])

    const handlePoinetrUp = useCallback((event: React.PointerEvent) => {
        setCursorState((state: CursorState) => cursorstate.mode === CursorMode.Reaction ? { ...state, isPressed: true } : state);
    }, [cursorstate.mode, setCursorState])

    const handlePoinetrDown = useCallback((event: React.PointerEvent) => {
        const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
        const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

        updateMyPresence({ cursor: { x, y } });
        setCursorState((state: CursorState) => cursorstate.mode === CursorMode.Reaction ? { ...state, isPressed: true } : state);
    }, [cursorstate.mode, setCursorState])

    useEffect(() => {
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key === "/") {
                setCursorState({
                    mode: CursorMode.Chat,
                    previousMessage: null,
                    message: "",
                })
            } else if (event.key == "Escape") {
                updateMyPresence({ message: "" })
                setCursorState({ mode: CursorMode.Hidden })
            } else if (event.key === "e") {
                setCursorState({
                    mode: CursorMode.ReactionSelector,
                })
            }
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "/") {
                event.preventDefault();
            }
        }
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("keydown", onKeyDown);
        }
    }, [])

    const setreactions = useCallback((reaction: string) => {
        setCursorState({ mode: CursorMode.Reaction, reaction, isPressed: false })
    }, [])

    return (



        <div
            id="canvas"
            onPointerMove={handlePoinetrMove}
            onPointerLeave={handlePoinetrLeave}
            onPointerDown={handlePoinetrDown}
            onPointerUp={handlePoinetrUp}
            className='h-[100vh] w-full flex justify-center items-center text-center'
        >
            <canvas ref={canvasRef} />

            {reactions.map((r) => (
                <FlyingReaction key={r.timestamp} x={r.point.x} y={r.point.y} timestamp={r.timestamp} value={r.value} />
            ))}

            {cursor && (<CursorChat cursor={cursor} cursorState={cursorstate} setCursorState={setCursorState} updateMyPresence={updateMyPresence} />)}

            {cursorstate.mode === CursorMode.ReactionSelector && (
                <ReactionSelector
                    setReaction={setreactions}
                />
            )}

            <LiveCursors others={others} />
        </div>
    )
}

export default Live