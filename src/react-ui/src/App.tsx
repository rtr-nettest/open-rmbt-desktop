import { useState, useEffect, useReducer } from "react"
import "./App.scss"

declare global {
    interface Window {
        electronAPI: {
            runMeasurement: () => Promise<void>
            getCurrentPing: () => Promise<number>
            getCurrentDownload: () => Promise<number>
            getCurrentUpload: () => Promise<number>
            onMeasurementFinish: (callback: (results: number[]) => any) => any
        }
    }
}

let interval: NodeJS.Timer | undefined

type AppState = {
    isMeasurementRunning: boolean
    ping: number
    download: number
    upload: number
}

type Action = {
    type: "startMeasurement" | "finishMeasurement" | "setInterimResults"
    payload: any
}

const initialState: AppState = {
    isMeasurementRunning: false,
    ping: -1,
    download: -1,
    upload: -1,
}

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case "setInterimResults":
            return {
                ...state,
                ping: action.payload[0],
                download: action.payload[1],
                upload: action.payload[2],
            }
        case "startMeasurement":
            return { ...initialState, isMeasurementRunning: true }
        case "finishMeasurement":
            return {
                ...initialState,
                ping: action.payload[0],
                download: action.payload[1],
                upload: action.payload[2],
            }
    }
}

function App() {
    const [state, dispatch] = useReducer(reducer, initialState)
    useEffect(() => {
        if (state.isMeasurementRunning) {
            interval = setInterval(async () => {
                console.log("Checking results")
                const payload = await Promise.all([
                    window.electronAPI.getCurrentPing(),
                    window.electronAPI.getCurrentDownload(),
                    window.electronAPI.getCurrentUpload(),
                ])
                dispatch({
                    type: "setInterimResults",
                    payload,
                })
            }, 200)
        } else {
            clearInterval(interval)
        }
        return () => clearInterval(interval)
    }, [state.isMeasurementRunning])

    const runMeasurement = async () => {
        dispatch({ type: "startMeasurement", payload: null })
        await window.electronAPI.runMeasurement()
        window.electronAPI.onMeasurementFinish((payload) => {
            dispatch({
                type: "finishMeasurement",
                payload,
            })
        })
    }

    return (
        <div className="app-block app-block--center app-block--fullscreen">
            {!state.isMeasurementRunning ? (
                <button onClick={() => runMeasurement()}>
                    Run measurement
                </button>
            ) : (
                <div>Measurement is running</div>
            )}
            <table className="app-table">
                <thead>
                    <tr>
                        <th>Ping, ms</th>
                        <th>Download, Mbps</th>
                        <th>Upload, Mbps</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{state.ping >= 0 ? state.ping : "-"}</td>
                        <td>{state.download >= 0 ? state.download : "-"}</td>
                        <td>{state.upload >= 0 ? state.upload : "-"}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

export default App
