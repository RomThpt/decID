import { Client, xrpToDrops, dropsToXrp } from "xrpl";
import React, { useEffect, useState } from "react";
import DIDSetTransaction from "./Did";

// A common flow of creating a test account and sending XRP
function App() {
    return (
        <div>
            <DIDSetTransaction />
        </div>
    );
}

// Search xrpl.org for docs on transactions + requests you can do!
export default App;
