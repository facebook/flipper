/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from "react"
import mermaid from "mermaid"

mermaid.initialize({
  startOnLoad: true
})

/*
Use in *.mdx like:

 import Mermaid from '@theme/Mermaid'
 <Mermaid chart={`
 flowchart TD
     cr([Create Request]) --> backoffice[Backoffice Server REST]
 `}/>
*/
const Mermaid = ({ chart }) => {
  useEffect(() => {
    mermaid.contentLoaded()
  }, [])
  return <div className="mermaid">{chart}</div>
}

export default Mermaid;
