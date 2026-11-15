import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Sample} from './Sample.jsx';
const Root=()=> <Composition id="AtlasSample" component={Sample} width={640} height={360} fps={30} durationInFrames={90}/>;
registerRoot(Root);
