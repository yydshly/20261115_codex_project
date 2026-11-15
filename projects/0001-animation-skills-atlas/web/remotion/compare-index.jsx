import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {CaseStudy,DURATION} from './CaseStudy.jsx';
const Root=()=> <Composition id="SameCase" component={CaseStudy} width={1280} height={720} fps={24} durationInFrames={DURATION*24}/>;
registerRoot(Root);
