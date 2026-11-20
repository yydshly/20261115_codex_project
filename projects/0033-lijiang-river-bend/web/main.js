import * as THREE from 'three';
import { buildSky, buildTerrain } from './landscape.js';
import { buildVegetation } from './foliage.js';
import { buildPebbles } from './pebbles.js';
import { bounds, DETAIL_LAYER, navigationBounds, riverBank } from './river-layout.js';
import { createSceneAudio } from './scene-audio.js';
import { bakeTerrainLight } from './lighting.js';
import { buildWater } from './water.js';
import { buildSplats } from './splats.js';
import { buildBoat } from './boat.js';
import { buildMotorboat, createTourMotor } from './motorboat.js';
import { buildBoatDriver } from './boat-driver.js';
import { buildAircraft } from './aircraft.js';
import { stepFlight } from './flight-motion.js';
import { buildFlightCockpit, FLIGHT_COCKPIT_LAYER } from './flight-cockpit.js';
import { planAerialEntry, resolveAerialReturn } from './aerial-route.js';
import { createGuidedFlight, stepGuidedFlight } from './guided-flight.js';
import { planPierWalk, samplePierWalk } from './journey-walk.js';
import { resolveChasePose } from './chase-camera.js';
import { buildDocks } from './dock-model.js';
import {
  buildDockLayout, dockSurfaceAt, DOCK_ASSIST_DISTANCE, DOCK_ASSIST_SPEED, findDryLanding, isAtBerth,
  nearestDock, planDockApproach, sampleDockApproach,
} from './docks.js';
import { createVesselNavigation } from './vessel-shallows.js';
import { findWalkablePoint, walkAlongShore } from './shore-access.js';
import {
  CRUISE_BOARDING_TIME, CRUISE_DURATION, cruiseChapters, planCruiseRejoin, sampleCruise, sampleCruiseRejoin,
} from './cruise.js';

const view = document.getElementById('view');
const controls = document.getElementById('controls');
const loading = document.getElementById('loading');
const journeyPanel = document.getElementById('journey-panel');
const journeyStart = document.getElementById('journey-start');
const journeyStartLabel = journeyStart.querySelector('span');
const journeyDuration = document.getElementById('journey-duration');
const journeyStatus = document.getElementById('journey-status');
const journeyClock = document.getElementById('journey-clock');
const journeyExit = document.getElementById('journey-exit');
const voyagePanel = document.getElementById('voyage-panel');
const voyageSelect = document.getElementById('voyage-chapters');
const voyageClock = document.getElementById('voyage-time');
const voyageToggle = document.getElementById('voyage-toggle');
const walkButton = document.getElementById('return-walk');
const dockPanel = document.getElementById('dock-panel');
const dockButton = document.getElementById('dock-action');
const dockButtonLabel = dockButton.querySelector('span');
const dockDestination = document.getElementById('dock-destination');
const dockStatus = document.getElementById('dock-status');
const transferVeil = document.getElementById('view-transfer');
const transferLabel = transferVeil.querySelector('span');
const perspectiveControls = document.getElementById('perspective-controls');
const perspectiveButtons = [...perspectiveControls.querySelectorAll('[data-perspective]')];
const driveHint = document.getElementById('drive-hint');
const vehicleReadout = document.getElementById('vehicle-readout');
const soundToggle = document.getElementById('sound-toggle');
const soundLabel = soundToggle.querySelector('span');
const sceneAudio = createSceneAudio((status) => {
  soundToggle.setAttribute('aria-pressed',String(status === 'on'));
  soundToggle.disabled = status === 'unavailable';
  soundLabel.textContent = {off:'开启声音', starting:'正在开启', on:'静音', unavailable:'声音不可用'}[status];
});
sceneAudio.setVisible(!document.hidden);
const canvas = document.createElement('canvas');
canvas.tabIndex = 0;
canvas.setAttribute('aria-label', '河湾画面，拖动可转头');
const context = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
if (!context) throw new Error('webgl2');

const renderer = new THREE.WebGLRenderer({ canvas, context });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;
view.append(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9c7c4);
const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 3550);
camera.layers.enable(DETAIL_LAYER);
const terrain = buildTerrain();
const docks = buildDockLayout(terrain.heightAt);
const originDock = docks.find((dock) => dock.id === 'origin');
const returnDock = docks.find((dock) => dock.id === 'return');
const journeyWalks = {
  approach: planPierWalk(originDock),
  departure: planPierWalk(returnDock,true),
};
const shoreSurfaceAt = (x,t) => Math.max(terrain.heightAt(x,t),dockSurfaceAt(docks,x,t) ?? -Infinity);
const vesselNavigation = createVesselNavigation(shoreSurfaceAt);
const vegetation = buildVegetation(terrain.heightAt);
terrain.setRootFooting(vegetation.shadeCanopies);
const terrainLight = bakeTerrainLight(terrain.heightAt, vegetation.shadeCanopies);
terrain.setLightMap(terrainLight);
const splats = buildSplats(vegetation.closeCanopies);
const water = buildWater(camera, terrain.bathymetry);
const boat = buildBoat();
const tourMotor = createTourMotor();
const motorboat = buildMotorboat();
const tourDriver = buildBoatDriver({ outfit: 'tour', ...tourMotor.driverAnchors });
const fastDriver = buildBoatDriver({ outfit: 'fast', ...motorboat.driverAnchors });
boat.add(tourMotor.mesh, tourDriver.mesh);
motorboat.mesh.add(fastDriver.mesh);

// Keep the skipper's face in the water reflection when the main camera occupies their seat.
const helmHeadLayer = 3;
for (const driver of [tourDriver,fastDriver]) {
  driver.head.traverse((part) => part.layers.set(helmHeadLayer));
}
camera.layers.enable(helmHeadLayer);
water.mesh.camera.layers.enable(helmHeadLayer);
const tourPropeller = tourMotor.mesh.getObjectByName('Tour outboard pivot');
const fastPropeller = motorboat.mesh.getObjectByName('Steerable outboard pivot');
const propPosition = new THREE.Vector3();
const propHeading = new THREE.Vector3();

const aircraft = buildAircraft();
const cockpit = buildFlightCockpit();
const aircraftRig = new THREE.Group();
const airframeLayer = 5;
aircraft.mesh.traverse((part) => part.layers.set(airframeLayer));
aircraft.mesh.visible = true;
aircraftRig.add(aircraft.mesh,cockpit.mesh);
aircraftRig.visible = false;
water.mesh.camera.layers.enable(airframeLayer);
boat.visible = false;
motorboat.mesh.visible = false;
scene.add(buildSky(), terrain.mesh, ...buildPebbles(terrain.heightAt, terrainLight), ...vegetation.meshes, water.mesh,
  splats.mesh, boat, motorboat.mesh, aircraftRig, buildDocks(docks,terrain.heightAt));

const stops = {
  bank: dockShoreView(originDock),
  shallows: { x: -24.6, t: 13, yaw: 0.22, pitch: -0.38, lift: 1.42 },
  overlook: { x: -46, t: 26, yaw: 0.46, pitch: -0.23, lift: 28 },
};
const pose = { ...stops.bank };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pressed = new Map();
const directionAliases = { KeyW: 'ArrowUp', KeyA: 'ArrowLeft', KeyS: 'ArrowDown', KeyD: 'ArrowRight' };
const arrowBindings = Object.fromEntries(Object.entries(directionAliases).map(([code, arrow]) => [arrow, code]));
const modeShortcuts = { Digit0: 'walk', Digit1: 'tour', Digit2: 'boat', Digit3: 'flight' };
const movementKeys = new Set([
  ...Object.keys(directionAliases), ...Object.values(directionAliases), 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight',
]);
const helmKeys = Object.keys(directionAliases);
const driveButtons = Array.from(controls.querySelectorAll('[data-key]'));
const pointerKeys = new Map();
const tapKeys = new Map();
const tapDuration = 0.36;
const target = new THREE.Vector3();
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const angleDelta = (a, b) => Math.atan2(Math.sin(b-a), Math.cos(b-a));
let activeStop = 'bank';
let transition = null;
let pointer = null;
let cameraY = 0;
let previousTime = 0;
let elapsed = 0;
const scaleOptions = [1, 0.87, 0.74, 0.63];
let resolutionLevel = 0;
let slowFrames = 0;
let fastFrames = 0;
let mode = 'walk';
let perspective = 'first';
let chaseDistanceScale = 1;
let cruiseTime = 0;
let voyagePaused = false;
let tourControl = 'guided';
let tourRejoin = null;
let tourNotice = '';
let waitForHelmRelease = false;
let woodSeatBlend = 0;
let lastVessel = null;
let helm = null;
let previousWoodHelm = null;
let woodRemainder = 0;
let flight = null;
let aerialVisit = null;
let journey = null;
let docking = null;
let dockNotice = '';
let viewTransfer = null;
let parkedVessel = { dock:originDock, kind:'wood', pose:originDock.berths.wood };
let boatHeel = 0;
let boatSteering = 0;
let soundThrottle = 0;
let soundCountdown = 0;
const soundRight = new THREE.Vector3();
const helmEye = new THREE.Vector3();
const glance = { yaw: 0, pitch: 0 };
const boatFollow = { distance: 7.1, elevation: 3.05, lookAhead: 2.35, focusHeight: 0.26, clearance: 1.18 };
const speedboatFollow = { distance: 8.1, elevation: 3.2, lookAhead: 2.55, focusHeight: 0.29, clearance: 1.18 };
const aircraftFollow = { distance: 15.2, elevation: 5.8, lookAhead: 9.0, focusHeight: 0.09, clearance: 2.7 };
const cockpitGaze = new THREE.Euler(0,0,0,'YXZ');
const cockpitHead = new THREE.Quaternion();
const cockpitRestPitch = -0.09;
const cockpitYawLimit = 1.0;
const woodStep = 1/60;
const woodPilotPitch = -0.06;
const chapterPlaceholder = new Option('选择航线章节','');
chapterPlaceholder.disabled = true;
chapterPlaceholder.hidden = true;
const modeHints = {
  walk: '点按或按住方向按钮 · 拖动转头',
  tour: '拖动看两岸 · 方向按钮接管木船',
  boat: '按住前进给油 · 松开后滑行',
  flight: '保持向前巡航 · 按住按钮操控',
};
const walkingButtons = {
  KeyW: ['前进', '向前'], KeyA: ['左移', '向左'], KeyS: ['后退', '向后'], KeyD: ['右移', '向右'],
};
const boatingButtons = {
  KeyW: ['前进', '向前'], KeyA: ['左转', '左转'], KeyS: ['倒船', '倒船'], KeyD: ['右转', '右转'],
};
const flightButtons = {
  KeyW: ['加速', '加速'], KeyA: ['左转', '左转'], KeyS: ['减速', '减速'], KeyD: ['右转', '右转'],
};

for (const { id, label } of cruiseChapters) voyageSelect.add(new Option(label, id));
dockDestination.add(new Option('前往泊位',''));
for (const { id,label } of docks) dockDestination.add(new Option(label,id));

function timeLabel(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole/60)}:${String(whole%60).padStart(2, '0')}`;
}

function journeyWalk() {
  return mode === 'walk' ? journeyWalks[journey?.stage] : null;
}

function syncJourneyUI() {
  const stage = journey?.stage ?? '';
  if (journeyPanel.dataset.stage !== stage) {
    journeyPanel.dataset.stage = stage;
    journeyStart.hidden = Boolean(stage) && stage !== 'complete';
    journeyStartLabel.textContent = stage === 'complete' ? '再走一遍' : '完整航程';
    journeyDuration.hidden = Boolean(stage);
    journeyStatus.hidden = !stage;
    journeyClock.hidden = !stage;
    journeyExit.hidden = !stage;
    journeyExit.textContent = stage === 'complete' ? '关闭' : '结束引导';
  }
  controls.toggleAttribute('data-guided-walk',Boolean(journeyWalk()));
  controls.toggleAttribute('data-guided-voyage',stage === 'water' || stage === 'landing');
  if (!stage) return;
  let status;
  switch (stage) {
    case 'approach': status = '岸上 · 前往浅滩码头'; break;
    case 'water': {
      const chapter = cruiseChapters.find((item) => item.id === voyageSelect.value);
      const label = chapter?.id === 'arrival' ? '木船离开浅滩码头' : chapter?.label;
      status = docking ? '水上 · 正在靠泊'
        : tourControl === 'manual' ? '水上 · 手动掌舵'
          : tourControl === 'rejoining' ? '水上 · 接回航线'
            : `水上 · ${label ?? '木船游览'}`;
      break;
    }
    case 'landing': status = '宽湾码头 · 已靠岸'; break;
    case 'departure': status = '岸上 · 沿栈道走向干岸'; break;
    case 'air': status = `空中 · ${journey.air.chapter.label}`; break;
    case 'complete': status = '航程完成'; break;
  }
  if (journeyStatus.textContent !== status) journeyStatus.textContent = status;
  const time = timeLabel(journey.elapsed);
  if (journeyClock.textContent !== time) journeyClock.textContent = time;
}

function setJourneyStage(stage) {
  journey.stage = stage;
  journey.stageTime = 0;
  syncJourneyUI();
}

function startJourney() {
  if (viewTransfer || (journey && journey.stage !== 'complete')) return;
  transferView(() => {
    const shore = samplePierWalk(journeyWalks.approach,0);
    const leaveMoored = { dock:originDock, kind:'wood', pose:originDock.berths.wood };
    perspective = 'first';
    if (mode === 'walk') {
      cancelTransition();
      Object.assign(pose,shore);
      cameraY = shoreSurfaceAt(pose.x,pose.t)+pose.lift;
      parkedVessel = leaveMoored;
      setVesselVisibility();
    } else switchMode('walk',{ shore,leaveMoored });
    resetGlance();
    water.clearWake();
    journey = { stage:'approach', stageTime:0, elapsed:0, air:null };
    syncJourneyUI();
    canvas.focus({ preventScroll:true });
  },'浅滩码头');
}

function releaseJourneyFlight() {
  glance.yaw += journey.air.lookYaw;
  glance.pitch += guidedFlightPitch(journey.air);
  journey.air = null;
}

function endJourney() {
  if (!journey) return;
  if (journey.air) releaseJourneyFlight();
  if (journeyWalk()) {
    pose.yaw += glance.yaw;
    pose.pitch = clamp(pose.pitch+glance.pitch,-1.35,0.95);
    resetGlance();
  }
  journey = null;
  syncJourneyUI();
  if (mode === 'flight') updatePerspectiveUI();
}

function advanceJourney(seconds) {
  if (!journey || !seconds || journey.stage === 'complete') return;
  const { stage } = journey;
  if (!(stage === 'water' && tourControl === 'guided' && voyagePaused)) journey.elapsed += seconds;
  journey.stageTime += seconds;
  if (stage === 'approach' && journey.stageTime >= journeyWalks.approach.duration) {
    transferView(() => {
      switchMode('tour',{ boardGuide:true });
      setJourneyStage('water');
    },'登上木船');
  } else if (stage === 'water' || stage === 'landing') {
    const reachedBerth = mode === 'tour' && berthAlongside() === returnDock
      && (tourControl === 'manual' || cruiseTime >= CRUISE_DURATION);
    if (stage === 'water' && reachedBerth) setJourneyStage('landing');
    else if (stage === 'landing' && !reachedBerth) setJourneyStage('water');
    else if (stage === 'landing' && journey.stageTime >= 4) returnToShore();
  } else if (stage === 'departure' && journey.stageTime >= journeyWalks.departure.duration+3) {
    Object.assign(pose,samplePierWalk(journeyWalks.departure,journeyWalks.departure.duration));
    beginAerial(true);
  } else if (stage === 'air' && journey.air.complete) {
    releaseJourneyFlight();
    setJourneyStage('complete');
    updatePerspectiveUI();
  }
}

function guidedTourHint() {
  return cruiseTime < CRUISE_BOARDING_TIME ? '正在登船 · 方向键在登船后可接管' : modeHints.tour;
}

function syncVoyageUI(chapter) {
  if (tourControl !== 'guided') {
    voyageToggle.hidden = false;
    if (!chapterPlaceholder.parentNode) voyageSelect.add(chapterPlaceholder,0);
    if (voyageSelect.value !== '') voyageSelect.value = '';
    const label = tourControl === 'manual' ? '手动驾驶' : '正在接回航线';
    const action = tourControl === 'manual' ? '恢复游览' : '接回中';
    if (voyageClock.textContent !== label) voyageClock.textContent = label;
    if (voyageToggle.textContent !== action) voyageToggle.textContent = action;
    if (voyageToggle.disabled !== (tourControl === 'rejoining')) voyageToggle.disabled = tourControl === 'rejoining';
    return;
  }
  if (chapterPlaceholder.parentNode) chapterPlaceholder.remove();
  const label = `${timeLabel(cruiseTime)} / ${timeLabel(CRUISE_DURATION)}`;
  if (voyageClock.textContent !== label) voyageClock.textContent = label;
  if (voyageSelect.value !== chapter) voyageSelect.value = chapter;
  const action = cruiseTime >= CRUISE_DURATION ? '重游' : voyagePaused ? '继续游览' : '暂停游览';
  if (voyageToggle.textContent !== action) voyageToggle.textContent = action;
  if (voyageToggle.disabled) voyageToggle.disabled = false;
  voyageToggle.hidden = Boolean(journey) && cruiseTime >= CRUISE_DURATION;
  const hint = guidedTourHint();
  if (mode === 'tour' && driveHint.textContent !== hint) driveHint.textContent = hint;
}

function resetGlance() {
  glance.yaw = 0;
  glance.pitch = 0;
}

function updatePerspectiveUI() {
  const aboard = mode === 'tour' || mode === 'boat';
  const following = mode !== 'walk' && perspective === 'third';
  const aircraftFollowing = mode === 'flight' && following;
  if (!following && (mode === 'boat' || (mode === 'tour' && woodSeatBlend > 0.73))) {
    camera.layers.disable(helmHeadLayer);
  }
  else camera.layers.enable(helmHeadLayer);
  perspectiveControls.hidden = mode === 'walk';
  aircraftRig.visible = mode === 'flight';
  cockpit.mesh.visible = mode === 'flight' && !aircraftFollowing;
  if (aircraftFollowing) camera.layers.enable(airframeLayer);
  else camera.layers.disable(airframeLayer);
  if (cockpit.mesh.visible) camera.layers.enable(FLIGHT_COCKPIT_LAYER);
  else camera.layers.disable(FLIGHT_COCKPIT_LAYER);
  if (updateLens()) water.invalidate();
  for (const button of perspectiveButtons) {
    const selected = button.dataset.perspective === perspective;
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('kbd').hidden = selected;
    if (selected) button.removeAttribute('aria-keyshortcuts');
    else button.setAttribute('aria-keyshortcuts', 'C');
  }
  const tourHint = tourControl === 'guided' ? guidedTourHint()
    : tourControl === 'rejoining' ? '正在接回自动航线 · 方向键可接管'
      : tourNotice || '驾驶木船 · 按 1 恢复自动游览';
  driveHint.textContent = mode === 'tour' ? tourHint
    : mode === 'flight' && journey?.air ? '沿来路回望 · 方向键可接管'
      : following ? `${modeHints[mode]} · 拖动环看` : modeHints[mode];
  controls.dataset.tourControl = mode === 'tour' ? tourControl : '';
  vehicleReadout.hidden = mode !== 'boat' && mode !== 'flight' && !(mode === 'tour' && tourControl !== 'guided');
  canvas.setAttribute('aria-label', following ? '河湾画面，拖动环看载具' : '河湾画面，拖动可转头');
  const buttonLabels = aboard ? boatingButtons : mode === 'flight' ? flightButtons : walkingButtons;
  for (const button of driveButtons) {
    const label = buttonLabels[button.dataset.key];
    if (!label) continue;
    button.querySelector('span').textContent = label[0];
    button.setAttribute('aria-label', label[1]);
  }
}

function selectPerspective(next) {
  if (mode === 'walk' || next === perspective || viewTransfer) return;
  const focused = document.activeElement;
  perspective = next;
  resetGlance();
  updatePerspectiveUI();
  if (perspectiveControls.contains(focused) && !focused.getClientRects().length) {
    perspectiveControls.querySelector('[aria-pressed="false"]').focus({ preventScroll:true });
  }
  water.invalidate();
}

function seekCruise(seconds) {
  docking = null;
  dockNotice = '';
  tourControl = 'guided';
  tourRejoin = null;
  tourNotice = '';
  waitForHelmRelease = false;
  woodSeatBlend = 0;
  cruiseTime = clamp(seconds, 0, CRUISE_DURATION);
  resetGlance();
  water.clearWake();
  syncVoyageUI(sampleCruise(cruiseTime).chapter);
  if (mode === 'tour') updatePerspectiveUI();
  water.invalidate();
}

function takeWoodHelm() {
  const guided = tourControl === 'guided' ? sampleCruise(cruiseTime) : null;
  const source = guided?.boat ?? lastVessel;
  setHelm({ ...source, speed: guided && voyagePaused ? 0 : source.speed });
  if (guided) {
    glance.yaw = angleDelta(source.yaw,guided.yaw+glance.yaw);
    if (perspective === 'first') glance.pitch += guided.pitch-woodPilotPitch;
  }
  tourControl = 'manual';
  tourRejoin = null;
  tourNotice = '';
  syncVoyageUI();
  updatePerspectiveUI();
}

function beginTourRejoin() {
  if (tourControl !== 'manual') return;
  const plan = planCruiseRejoin(lastVessel,(vessel) => vesselNavigation.isAfloat(vessel,'wood'));
  if (plan) {
    tourControl = 'rejoining';
    tourRejoin = { ...plan, elapsed: 0 };
    tourNotice = '';
    waitForHelmRelease = helmKeys.some(moving);
  } else {
    tourNotice = journey ? '请回到航线附近，朝顺流方向航行，再按 1'
      : '暂时无法接回航线 · 可调整航向或选择章节';
  }
  syncVoyageUI();
  updatePerspectiveUI();
}

function setHelm(source) {
  helm = { ...source };
  previousWoodHelm = { ...helm };
  woodRemainder = 0;
}

function setVehicleReadout(speed, altitude, limit = '') {
  const kmh = Math.round(Math.abs(speed)*3.6);
  const message = altitude === undefined
    ? `${kmh} km/h${speed < -0.2 ? ' · 倒船' : ''}${limit ? ` · ${limit}` : ''}`
    : `${kmh} km/h · 距地 ${Math.round(altitude)} m`;
  if (vehicleReadout.textContent !== message) vehicleReadout.textContent = message;
}

function setVesselVisibility() {
  const parked = mode === 'walk' ? parkedVessel : null;
  boat.visible = mode === 'tour' || parked?.kind === 'wood';
  motorboat.mesh.visible = mode === 'boat' || parked?.kind === 'fast';
  if (!parked) return;
  const { x,t,yaw } = parked.pose;
  const wood = parked.kind === 'wood';
  const hull = wood ? boat : motorboat.mesh;
  const hardware = wood ? tourMotor : motorboat;
  const driver = wood ? tourDriver : fastDriver;
  hull.position.set(x,0,-t);
  hull.rotation.set(0,-yaw,0,'YXZ');
  hardware.update(0,0,0);
  driver.update({ hands:hardware.getDriverHands() });
}

function switchMode(next, { boatPose, boardGuide = false, shore, leaveMoored = null, flightEntry } = {}) {
  if (next === mode) return;
  if (next === 'flight' && !flightEntry) return;
  const wasVessel = mode === 'tour' || mode === 'boat';
  const lastX = wasVessel && lastVessel ? lastVessel.x : pose.x;
  const lastT = wasVessel && lastVessel ? lastVessel.t : pose.t;
  cancelTransition();
  docking = null;
  dockNotice = '';
  if (next === 'boat') {
    const source = boatPose ?? (wasVessel && lastVessel ? lastVessel : {
      x: lastX, t: lastT, yaw: pose.yaw, speed: 0,
    });
    const launch = vesselNavigation.safeLaunch(source,'runabout') ?? originDock.berths.fast;
    setHelm(launch);
  } else if (next === 'tour') {
    voyagePaused = false;
    seekCruise(boardGuide || boatPose || reducedMotion.matches ? CRUISE_BOARDING_TIME : 0);
    if (boatPose) {
      setHelm(boatPose);
      tourControl = 'manual';
      woodSeatBlend = 1;
    }
  } else if (next === 'flight') {
    flight = flightEntry.flight;
  } else {
    Object.assign(pose,shore ?? originDock.shore);
    cameraY = shoreSurfaceAt(pose.x,pose.t) + pose.lift;
  }
  resetGlance();
  if (next === 'flight' && perspective === 'first') {
    const entryYawLimit = camera.aspect < 0.72 ? 0.075 : 0.16;
    glance.yaw = clamp(angleDelta(flight.yaw,flightEntry.look.yaw),-entryYawLimit,entryYawLimit);
    glance.pitch = clamp(flightEntry.look.pitch-flight.pitch-cockpitRestPitch,-0.40,0.46);
  }
  if (next !== 'flight') aerialVisit = null;
  mode = next;
  const aboard = mode === 'tour' || mode === 'boat';
  parkedVessel = mode === 'walk' ? leaveMoored : null;
  setVesselVisibility();
  boatHeel = 0;
  boatSteering = 0;
  if (!aboard) water.setWake(null);
  water.invalidate();
  controls.dataset.mode = mode;
  controls.querySelectorAll('[data-mode]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  });
  document.getElementById('shore-stops').hidden = mode !== 'walk';
  document.getElementById('altitude-pad').hidden = mode !== 'flight';
  updatePerspectiveUI();
  walkButton.hidden = mode === 'walk';
  voyagePanel.hidden = mode !== 'tour';
  if (mode !== 'walk') controls.querySelector('[data-mode][aria-pressed=true]').focus({ preventScroll: true });
  else controls.querySelector('[data-mode=tour]').focus({ preventScroll: true });
}

function nearDockOnLand() {
  if (mode !== 'walk' || pose.lift > 2.2) return null;
  return docks.find((dock) => Math.hypot(pose.x-dock.shore.x,pose.t-dock.shore.t) <= 6.5
    || dockSurfaceAt([dock],pose.x,pose.t) !== null) ?? null;
}

function dockShoreView(dock) {
  const { x,t } = dock.shore;
  return { x,t, lift:1.65, pitch:-0.12, yaw:Math.atan2(dock.boarding.x-x,dock.boarding.t-t) };
}

function berthAlongside() {
  const kind = mode === 'boat' ? 'fast' : 'wood';
  return lastVessel && docks.find((dock) => isAtBerth(dock,lastVessel,kind));
}

function refreshDockUI() {
  const onBoat = mode === 'boat' || mode === 'tour';
  const landDock = nearDockOnLand();
  const ready = onBoat && lastVessel && !(mode === 'tour' && cruiseTime < CRUISE_BOARDING_TIME);
  const berth = ready ? berthAlongside() : null;
  const kind = mode === 'boat' ? 'fast' : 'wood';
  const nearby = ready ? nearestDock(docks,lastVessel,kind) : null;
  const distance = nearby ? Math.hypot(lastVessel.x-nearby.berths[kind].x,lastVessel.t-nearby.berths[kind].t) : 0;
  const available = ready && (distance <= DOCK_ASSIST_DISTANCE || docking || berth);
  if (!available && !landDock) dockNotice = '';
  const action = docking ? '取消靠岸' : berth ? '下船' : landDock
    ? parkedVessel?.dock === landDock && parkedVessel.kind === 'fast' ? '登上快艇' : '登上木船' : '靠岸';
  const status = docking ? `正在驶向${docking.dock.label}` : berth ? `已停靠${berth.label}`
    : dockNotice || (available && nearby ? `${nearby.label} · ${Math.round(distance)} 米` : landDock?.label ?? '');
  dockPanel.hidden = mode !== 'walk' && !available && !status;
  dockDestination.hidden = mode !== 'walk';
  dockButton.hidden = !available && !landDock;
  if (dockButtonLabel.textContent !== action) dockButtonLabel.textContent = action;
  if (dockStatus.textContent !== status) dockStatus.textContent = status;
  dockStatus.hidden = status === '';
}

function transferView(commit, label = '') {
  if (viewTransfer) return;
  clearInput();
  if (reducedMotion.matches) commit();
  else {
    transferLabel.textContent = label;
    viewTransfer = { time:0, commit };
  }
}

function updateViewTransfer(seconds) {
  if (!viewTransfer) return;
  const elapsed = viewTransfer.time+seconds;
  viewTransfer.time = Math.min(viewTransfer.commit ? 0.28 : 0.56,elapsed);
  const progress = viewTransfer.time/0.56;
  transferVeil.style.opacity = String(1-Math.abs(progress*2-1));
  if (progress >= 0.5 && viewTransfer.commit) {
    const commit = viewTransfer.commit;
    viewTransfer.commit = null;
    commit();
  }
  if (progress >= 1) {
    viewTransfer = null;
    transferLabel.textContent = '';
    clearInput();
  }
}

function cancelDocking() {
  if (!docking) return;
  docking = null;
  setHelm(lastVessel);
  dockNotice = '';
}

function returnToShore() {
  if (mode === 'walk') return;
  const afloat = mode === 'boat' || mode === 'tour';
  const kind = mode === 'boat' ? 'fast' : 'wood';
  const berth = afloat ? berthAlongside() : null;
  const returningFromFlight = mode === 'flight' && aerialVisit;
  const landing = returningFromFlight ? resolveAerialReturn(flight,aerialVisit.entry,docks,terrain.heightAt)
    : findDryLanding(docks,afloat && lastVessel ? lastVessel : pose,terrain.heightAt);
  const dockExit = berth && { ...berth.boarding,
    yaw:Math.atan2(berth.shore.x-berth.boarding.x,berth.shore.t-berth.boarding.t), pitch:-0.15, lift:1.65 };
  const shore = dockExit ?? { yaw:pose.yaw, pitch:-0.06, lift:1.65, ...(landing ?? originDock.shore) };
  const mooredFromFlight = returningFromFlight && aerialVisit.moored;
  const closeToMoored = mooredFromFlight
    && Math.hypot(shore.x-mooredFromFlight.dock.shore.x,shore.t-mooredFromFlight.dock.shore.t) <= 12;
  const leaveMoored = berth ? { dock:berth, kind, pose:{ ...lastVessel, speed:0 } }
    : closeToMoored ? mooredFromFlight : null;
  const label = returningFromFlight && (leaveMoored ? `回到${leaveMoored.dock.label}` : '返回当前河段岸边');
  const guidedLanding = journey && berth && mode === 'tour' && berth === returnDock;
  transferView(() => {
    if (!guidedLanding) endJourney();
    switchMode('walk',{ shore,leaveMoored });
    if (guidedLanding) setJourneyStage('departure');
  },guidedLanding ? '宽湾码头 · 下船' : label || '');
}

function beginAerial(guided = false) {
  if (mode === 'flight') return;
  const afloat = mode === 'tour' || mode === 'boat';
  const mooring = afloat ? berthAlongside() : null;
  const dock = mooring ?? nearDockOnLand();
  const source = afloat && lastVessel ? lastVessel : pose;
  const entry = planAerialEntry({ ...source, altitude:cameraY, dockId:dock?.id },terrain.heightAt,docks);
  if (!entry) return;
  const moored = parkedVessel ?? (mooring ? { dock:mooring, kind:mode === 'boat' ? 'fast' : 'wood',
    pose:{ ...lastVessel,speed:0 } } : null);
  transferView(() => {
    aerialVisit = { entry,moored };
    if (guided) {
      perspective = 'third';
      journey.air = createGuidedFlight(entry.flight);
    }
    switchMode('flight',{ flightEntry:entry });
    if (guided) setJourneyStage('air');
  },guided ? '从宽湾飞回上游' : `飞越${entry.landmark.label}`);
}

function useDock() {
  if (viewTransfer || dockButton.hidden || journeyWalk()) return;
  const landDock = nearDockOnLand();
  if (landDock) {
    const parked = parkedVessel?.dock === landDock ? parkedVessel : null;
    const kind = parked?.kind ?? 'wood';
    transferView(() => switchMode(kind === 'wood' ? 'tour' : 'boat',{ boatPose:parked?.pose ?? landDock.berths[kind] }));
    return;
  }
  if (docking) {
    cancelDocking();
    return;
  }
  if (berthAlongside()) {
    returnToShore();
    return;
  }
  const kind = mode === 'boat' ? 'fast' : 'wood';
  const dock = nearestDock(docks,lastVessel,kind);
  const hullKind = kind === 'wood' ? 'wood' : 'runabout';
  const plan = planDockApproach(dock,lastVessel,kind,shoreSurfaceAt,
    (vessel) => vesselNavigation.isAfloat(vessel,hullKind));
  if (!plan) {
    dockNotice = Math.abs(lastVessel.speed) > DOCK_ASSIST_SPEED ? '收油减速后再靠岸' : '请朝泊位方向缓行';
    return;
  }
  if (kind === 'wood') takeWoodHelm();
  clearInput();
  dockNotice = '';
  docking = { dock, plan, time:0 };
}

function updateLens(aspect = camera.aspect) {
  const narrowCabin = aspect < 0.72 && mode === 'flight' && perspective === 'first';
  const fov = narrowCabin ? 76 : aspect < 1 ? 68 : 58;
  if (fov === camera.fov && aspect === camera.aspect) return false;
  camera.fov = fov;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  return true;
}

function resize() {
  const { clientWidth: width, clientHeight: height } = view;
  if (!width || !height) return;
  updateLens(width / height);
  const ratio = Math.min(devicePixelRatio, 1.35, 1640 / Math.max(width, height)) * scaleOptions[resolutionLevel];
  renderer.setDrawingBufferSize(width, height, ratio);
  water.resize(renderer.domElement.width, renderer.domElement.height);
}

function selectStop(name) {
  if (name === activeStop) return;
  activeStop = name;
  controls.querySelectorAll('[data-stop]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.stop === name));
  });
}

function cancelTransition() {
  transition = null;
  selectStop(null);
}

function goToStop(name) {
  if (viewTransfer) return;
  endJourney();
  tapKeys.clear();
  selectStop(name);
  if (reducedMotion.matches) {
    Object.assign(pose, stops[name]);
    transition = null;
    cameraY = Math.max(0,shoreSurfaceAt(pose.x,pose.t)) + pose.lift;
    return;
  }
  transition = { from: { ...pose }, to: stops[name], start: performance.now() };
}

function move(forward, side) {
  if (viewTransfer) return;
  if (shoreSurfaceAt(pose.x,pose.t) < 0.035 || pose.lift > 2.2) {
    const start = findWalkablePoint(shoreSurfaceAt,pose.x,pose.t)
      ?? findDryLanding(docks,pose,terrain.heightAt) ?? originDock.shore;
    pose.x = start.x;
    pose.t = start.t;
  }
  pose.lift = 1.65;
  const destination = {
    x:clamp(pose.x+Math.sin(pose.yaw)*forward+Math.cos(pose.yaw)*side,bounds.left+55,bounds.right-55),
    t:clamp(pose.t+Math.cos(pose.yaw)*forward-Math.sin(pose.yaw)*side,navigationBounds.start,navigationBounds.end),
  };
  Object.assign(pose,walkAlongShore(shoreSurfaceAt,pose,destination));
}

function moving(code) {
  if (pressed.has(code) || pressed.has(directionAliases[code]) || tapKeys.has(code)) return true;
  for (const input of pointerKeys.values()) if (input.code === code) return true;
  return false;
}

function queueDriveTap(code, seconds = tapDuration) {
  if (seconds > 0) tapKeys.set(code, Math.max(seconds, tapKeys.get(code) ?? 0));
}

function advanceButtonInput(seconds) {
  for (const input of pointerKeys.values()) input.elapsed += seconds;
  for (const [code, duration] of tapKeys) {
    if (duration <= seconds) tapKeys.delete(code);
    else tapKeys.set(code, duration - seconds);
  }
  for (const [code, duration] of pressed) pressed.set(code, duration + seconds);
}

function movementCode(event) {
  if (event.code && event.code !== 'Unidentified') return event.code;
  if (/^[0-3]$/.test(event.key)) return `Digit${event.key}`;
  return event.key.length === 1 ? `Key${event.key.toUpperCase()}` : event.key;
}

function lookFrom(x, height, t, yaw, pitch) {
  camera.position.set(x, height, -t);
  const flat = Math.cos(pitch);
  target.set(x + flat*Math.sin(yaw), height + Math.sin(pitch), -t - flat*Math.cos(yaw));
  camera.lookAt(target);
}

function followPose(anchor, setup, orbitYaw, orbitPitch) {
  return resolveChasePose(anchor, {
    ...setup,
    distance: setup.distance*chaseDistanceScale,
    lookAhead: setup.lookAhead*(camera.aspect < 0.8 ? 0.45 : 1),
    orbitYaw,
    orbitPitch,
  }, terrain.heightAt);
}

function lookFromChase(chase) {
  lookFrom(chase.x, chase.height, chase.t, chase.yaw, chase.pitch);
}

function updateHelm(seconds, forward, side) {
  if (seconds > 0) helm = vesselNavigation.step(helm,seconds,forward,side,'runabout');
  return fastPilotFrame(helm);
}

function fastPilotFrame(vessel) {
  return { x:vessel.x, t:vessel.t, lift:1.32, yaw:vessel.yaw, pitch:-0.112, boat:vessel };
}

function woodPilotFrame(vessel) {
  return {
    x: vessel.x-Math.sin(vessel.yaw)*1.05, t: vessel.t-Math.cos(vessel.yaw)*1.05,
    lift: 1.44, yaw: vessel.yaw, pitch: woodPilotPitch, boat: vessel,
  };
}

function updateWoodHelm(seconds, forward, side) {
  woodRemainder += seconds;
  while (woodRemainder >= woodStep) {
    woodRemainder -= woodStep;
    previousWoodHelm = { ...helm };
    helm = vesselNavigation.step(helm,woodStep,forward,side,'wood');
  }
  const u = woodRemainder/woodStep;
  const vessel = {
    x: lerp(previousWoodHelm.x,helm.x,u),
    t: lerp(previousWoodHelm.t,helm.t,u),
    yaw: previousWoodHelm.yaw+angleDelta(previousWoodHelm.yaw,helm.yaw)*u,
    speed: lerp(previousWoodHelm.speed,helm.speed,u),
    shoreLimited: helm.shoreLimited,
    endLimited: helm.endLimited,
  };
  return woodPilotFrame(vessel);
}

function updateCruiseFrame(seconds) {
  if (tourControl === 'rejoining') {
    tourRejoin.elapsed += seconds;
    const vessel = sampleCruiseRejoin(tourRejoin,tourRejoin.elapsed);
    if (tourRejoin.elapsed < tourRejoin.duration) {
      const steering = seconds > 0
        ? clamp(angleDelta(lastVessel.yaw,vessel.yaw)/seconds*1.82,-1,1)
        : boatSteering;
      return { ...woodPilotFrame(vessel), steering };
    }
    cruiseTime = Math.min(CRUISE_DURATION,tourRejoin.time+tourRejoin.elapsed-tourRejoin.duration);
    const guide = sampleCruise(cruiseTime);
    glance.yaw = angleDelta(guide.yaw,guide.boat.yaw+glance.yaw);
    if (perspective === 'first') glance.pitch += woodPilotPitch-guide.pitch;
    tourControl = 'guided';
    tourRejoin = null;
    voyagePaused = false;
    updatePerspectiveUI();
    return guide;
  }
  if (!voyagePaused) cruiseTime = Math.min(CRUISE_DURATION,cruiseTime+seconds);
  const guide = sampleCruise(cruiseTime);
  return voyagePaused ? { ...guide, steering: 0, boat: { ...guide.boat, speed: 0 } } : guide;
}

function updateVessel(seconds, forward, side) {
  const fast = mode === 'boat';
  if (docking && (forward || side)) cancelDocking();
  let dockFrame = null;
  if (docking) {
    docking.time = Math.min(docking.plan.duration,docking.time+seconds);
    const vessel = sampleDockApproach(docking.plan,docking.time);
    const steering = seconds > 0 ? clamp(angleDelta(lastVessel.yaw,vessel.yaw)/seconds*1.6,-1,1) : boatSteering;
    dockFrame = { ...(fast ? fastPilotFrame(vessel) : woodPilotFrame(vessel)), steering };
    if (docking.time >= docking.plan.duration) {
      setHelm(vessel);
      docking = null;
    }
  }
  if (waitForHelmRelease && !helmKeys.some(moving)) waitForHelmRelease = false;
  if (!fast && tourControl !== 'manual' && !waitForHelmRelease && (forward || side)
    && cruiseTime >= CRUISE_BOARDING_TIME) takeWoodHelm();
  const manual = fast || tourControl === 'manual';
  const tourFrame = manual || dockFrame ? null : updateCruiseFrame(seconds);
  const steeringTarget = dockFrame?.steering ?? (manual ? side : tourFrame.boat.speed > 0.5 ? tourFrame.steering : 0);
  const previousSteering = boatSteering;
  boatSteering = lerp(boatSteering,steeringTarget,1 - Math.exp(-seconds*8.8));
  if (Math.abs(boatSteering-steeringTarget) < 0.002) boatSteering = steeringTarget;
  const frame = dockFrame ?? (fast ? updateHelm(seconds,forward,boatSteering)
    : manual ? updateWoodHelm(seconds,forward,boatSteering) : tourFrame);
  lastVessel = frame.boat;
  const { x, t, yaw, speed } = lastVessel;
  const hardware = fast ? motorboat : tourMotor;
  const driver = fast ? fastDriver : tourDriver;
  const movingBoat = Math.abs(speed) > 0.5;
  const rocking = !reducedMotion.matches && movingBoat ? Math.sin(elapsed*2.2 + t*0.045)*0.023 : 0;
  const planing = fast ? THREE.MathUtils.smoothstep(speed, 4.3, 15.0) : 0;
  const trim = planing*0.078;
  const hull = fast ? motorboat.mesh : boat;
  const rise = rocking + planing*0.052;
  const throttle = dockFrame ? clamp(Math.abs(speed)/5.5,0,0.6) : fast
    ? clamp(forward ? 0.31 + Math.abs(speed)/26 : Math.abs(speed)/36, 0, forward ? 1 : 0.36)
    : manual ? clamp(forward ? 0.23+Math.abs(speed)/(forward > 0 ? 10 : 3.6) : Math.abs(speed)*0.012,0,1)
    : movingBoat ? Math.abs(speed)/8.0 : 0;
  soundThrottle = throttle;
  const heelTarget = -boatSteering*Math.sign(speed)*(fast ? 0.19 : 0.048)
    * THREE.MathUtils.smoothstep(Math.abs(speed), 1.0, fast ? 11.0 : 6.5);
  boatHeel = lerp(boatHeel, heelTarget,
    1 - Math.exp(-seconds*5.0));
  hull.position.set(x, rise, -t);
  hull.rotation.set(trim + rocking*0.28, -yaw, boatHeel + rocking*0.24, 'YXZ');
  const animationTime = reducedMotion.matches ? 0 : elapsed;
  const reverse = manual && (speed < -0.1 || (!movingBoat && forward < 0));
  hardware.update(animationTime, throttle, boatSteering, reverse);
  driver.update({ time: animationTime, steering: boatSteering, throttle, hands: hardware.getDriverHands() });
  if (reducedMotion.matches && Math.abs(boatSteering-previousSteering) > 0.001) water.invalidate();
  if (movingBoat || (manual && forward !== 0)) {
    const propeller = fast ? fastPropeller : tourPropeller;
    propeller.localToWorld(propPosition.set(0,-0.164,0.245));
    propHeading.set(0,0,-1).transformDirection(propeller.matrixWorld);
    water.setWake({
      ...lastVessel, throttle, planing, reverse,
      propX: propPosition.x, propZ: propPosition.z, propYaw: Math.atan2(propHeading.x,-propHeading.z),
    });
  } else water.setWake(null);
  if (fast || tourControl !== 'guided') {
    const limit = lastVessel.endLimited ? '航段边缘' : lastVessel.shoreLimited ? '浅水减速' : '';
    setVehicleReadout(speed,undefined,limit);
  }

  if (!fast) {
    const targetSeat = tourControl === 'guided' ? 0 : 1;
    woodSeatBlend = reducedMotion.matches ? targetSeat
      : lerp(woodSeatBlend,targetSeat,1-Math.exp(-seconds*6.4));
    if (Math.abs(woodSeatBlend-targetSeat) < 0.002) woodSeatBlend = targetSeat;
    if (perspective === 'third' || woodSeatBlend <= 0.73) camera.layers.enable(helmHeadLayer);
    else camera.layers.disable(helmHeadLayer);
  }
  pose.x = frame.x;
  pose.t = frame.t;
  pose.yaw = frame.yaw + glance.yaw;
  pose.pitch = clamp(frame.pitch + glance.pitch, -1.31, 0.78);
  cameraY = frame.lift + rise*(frame.lift < 2.3 ? 1 : 0);
  if (perspective === 'third') {
    const chase = followPose({ x, t, height: rise, yaw }, fast ? speedboatFollow : boatFollow,
      angleDelta(yaw, pose.yaw), glance.pitch);
    if (mode === 'tour' && cruiseTime < CRUISE_BOARDING_TIME) {
      const join = THREE.MathUtils.smoothstep(cruiseTime, CRUISE_BOARDING_TIME - 2.6, CRUISE_BOARDING_TIME);
      const x = lerp(pose.x, chase.x, join);
      const t = lerp(pose.t, chase.t, join);
      const height = Math.max(terrain.heightAt(x, t) + 1.05, lerp(cameraY, chase.height, join));
      lookFrom(x, height, t, pose.yaw + angleDelta(pose.yaw, chase.yaw)*join, lerp(pose.pitch, chase.pitch, join));
    } else {
      lookFromChase(chase);
    }
  } else if (fast || woodSeatBlend > 0) {
    hull.localToWorld(helmEye.copy(driver.eye));
    const blend = fast ? 1 : woodSeatBlend;
    pose.x = lerp(pose.x,helmEye.x,blend);
    pose.t = lerp(pose.t,-helmEye.z,blend);
    cameraY = lerp(cameraY,helmEye.y,blend);
    lookFrom(pose.x, cameraY, pose.t, pose.yaw, pose.pitch);
    if (!reducedMotion.matches) camera.rotateZ(boatHeel*0.32);
  } else {
    lookFrom(pose.x, cameraY, pose.t, pose.yaw, pose.pitch);
  }
  if (!fast && tourControl === 'guided') syncVoyageUI(frame.chapter);
}

function guidedFlightPitch(guide) {
  return perspective === 'third' ? guide.lookPitch : -Math.min(0.16,guide.lookPitch);
}

function updateAircraft(seconds, throttle, steer) {
  const climb = viewTransfer ? 0 : Number(moving('KeyE')) - Number(moving('KeyQ'));
  const boost = !viewTransfer && (moving('ShiftLeft') || moving('ShiftRight'));
  if (journey?.air && (throttle || steer || climb || boost)) endJourney();
  const guide = journey?.air;
  if (guide) stepGuidedFlight(guide,flight,seconds,terrain.heightAt);
  else stepFlight(flight, { throttle, steer, climb, boost }, seconds, terrain.heightAt);
  const { x, t, y, yaw, roll, pitch, speed } = flight;
  soundThrottle = clamp(0.34+(speed-25)*0.009+throttle*0.13+Math.max(0,climb)*0.14+(boost ? 0.17 : 0),0,1);
  const altitude = y - Math.max(0, terrain.heightAt(x, t));
  pose.x = x;
  pose.t = t;
  pose.lift = altitude;
  pose.yaw = yaw;
  pose.pitch = pitch*0.6 - 0.081;
  cameraY = y;
  setVehicleReadout(speed, altitude);
  aircraftRig.position.set(x,y,-t);
  aircraftRig.rotation.set(pitch,-yaw,roll,'YXZ');
  aircraft.update(reducedMotion.matches ? 0 : elapsed,clamp(speed/47,0.52,1.38));

  const lookYaw = glance.yaw+(guide?.lookYaw ?? 0);
  const lookPitch = glance.pitch+(guide ? guidedFlightPitch(guide) : 0);
  if (perspective === 'third') {
    lookFromChase(followPose({ x, t, height: y, yaw }, aircraftFollow, lookYaw, lookPitch));
  } else {
    cockpit.update({ speed,altitude,yaw,pitch,roll });
    cockpitGaze.set(clamp(cockpitRestPitch+lookPitch,-0.49,0.37),
      -clamp(lookYaw,-cockpitYawLimit,cockpitYawLimit),0);
    cockpitHead.setFromEuler(cockpitGaze);
    aircraftRig.localToWorld(camera.position.copy(cockpit.eye));
    camera.quaternion.multiplyQuaternions(aircraftRig.quaternion,cockpitHead);
  }
}

function updateCamera(time, frameStep) {
  updateViewTransfer(frameStep);
  advanceJourney(viewTransfer ? 0 : frameStep);
  const forward = viewTransfer ? 0 : Number(moving('KeyW')) - Number(moving('KeyS'));
  const side = viewTransfer ? 0 : Number(moving('KeyD')) - Number(moving('KeyA'));
  if (mode === 'tour' || mode === 'boat') {
    updateVessel(viewTransfer && journey ? 0 : frameStep, forward, side);
    return;
  }
  if (mode === 'flight') {
    updateAircraft(viewTransfer ? 0 : frameStep,forward,side);
    return;
  }
  const walk = journeyWalk();
  if (walk) Object.assign(pose,samplePierWalk(walk,journey.stageTime));
  else if (transition) {
    const { from, to, start } = transition;
    const u = clamp((time - start) / 1200, 0, 1);
    const blend = u*u*(3-2*u);
    for (const property of ['x', 't', 'pitch', 'lift']) {
      pose[property] = lerp(from[property], to[property], blend);
    }
    pose.yaw = from.yaw + angleDelta(from.yaw, to.yaw) * blend;
    if (u === 1) transition = null;
  }

  const boost = moving('ShiftLeft') || moving('ShiftRight');
  if (!walk && (forward || side)) {
    cancelTransition();
    const speed = (boost ? 12 : 5.2)*frameStep;
    const length = Math.hypot(forward, side);
    move(forward * speed / length, side * speed / length);
  }

  const floor = Math.max(0,shoreSurfaceAt(pose.x,pose.t));
  const eye = floor + pose.lift;
  const follow = 1 - Math.exp(-frameStep*11);
  const clearance = Math.min(0.75, pose.lift);
  cameraY = Math.max(floor + clearance, lerp(cameraY || eye, eye, follow));
  if (reducedMotion.matches || Math.abs(eye - cameraY) < 0.001) cameraY = eye;
  lookFrom(pose.x, cameraY, pose.t, pose.yaw+(walk ? glance.yaw : 0),
    clamp(pose.pitch+(walk ? glance.pitch : 0),-1.35,0.95));
}

function updateSound(seconds, immediate = false) {
  if (!sceneAudio.enabled) return;
  soundCountdown -= seconds;
  if (!immediate && soundCountdown > 0) return;
  soundCountdown = 1/25;

  const { x,y,z } = camera.position;
  const t = -z;
  soundRight.set(1,0,0).applyQuaternion(camera.quaternion);
  const left = riverBank(t,-1), right = riverBank(t,1);
  const leftDistance = Math.hypot(x-left,y);
  const rightDistance = Math.hypot(x-right,y);
  const waterDistance = Math.hypot(x-clamp(x,left,right),y);
  const waterPan = (soundRight.x*(left-x)-soundRight.y*y)/(4+leftDistance)**2
    + (soundRight.x*(right-x)-soundRight.y*y)/(4+rightDistance)**2;
  const afloat = mode === 'tour' || mode === 'boat';
  const airborne = mode === 'flight';
  const guided = mode === 'tour' && tourControl === 'guided';
  const paused = guided && voyagePaused;
  const motion = airborne ? flight : afloat ? lastVessel : null;
  const moored = (guided && (cruiseTime < CRUISE_BOARDING_TIME || cruiseTime >= CRUISE_DURATION))
    || (afloat && motion && soundThrottle === 0 && Math.abs(motion.speed) < 0.05 && berthAlongside());
  const engine = airborne ? 'aircraft' : motion && !moored ? (mode === 'boat' ? 'fast' : 'wood') : null;
  let enginePan = 0;
  let engineLevel = 0;
  if (engine) {
    const offset = airborne ? 0.8 : -2.15;
    const dx = motion.x+Math.sin(motion.yaw)*offset-x;
    const dy = (airborne ? motion.y : 0.18)-y;
    const dz = -motion.t-Math.cos(motion.yaw)*offset-z;
    const distance = Math.hypot(dx,dy,dz);
    enginePan = clamp((soundRight.x*dx+soundRight.y*dy+soundRight.z*dz)/(distance+1.5),-0.83,0.83);
    engineLevel = (paused ? 0.63 : 1)/(1+(distance/(airborne ? 27 : 9))**1.42);
  }
  const duck = viewTransfer ? 1-0.57*Number(transferVeil.style.opacity) : 1;
  sceneAudio.update({mode,speed:paused ? 0 : motion?.speed ?? 0,waterDistance,
    waterPan:clamp(waterPan/(1/(4+leftDistance)+1/(4+rightDistance)),-0.88,0.88),
    engine,enginePan,engineLevel,interior:perspective === 'first',throttle:engine && !paused ? soundThrottle : 0,duck});
}

function toggleSound() {
  sceneAudio.toggle();
  updateSound(0,true);
}

function draw(time) {
  const duration = previousTime ? (time - previousTime) / 1000 : 0;
  const step = Math.min(duration, 0.16);
  previousTime = time;
  elapsed += step;
  updateCamera(time, step);
  updateSound(step);
  refreshDockUI();
  syncJourneyUI();
  const wakeChanged = water.advanceWake(step,reducedMotion.matches);
  advanceButtonInput(step);
  splats.sort(camera);
  const cameraChanged = water.renderBed(renderer, scene, reducedMotion.matches ? 0 : elapsed);
  if (!cameraChanged && !wakeChanged && reducedMotion.matches) return;
  renderer.render(scene, camera);
  const slow = duration > 0.047 && !document.hidden;
  slowFrames = slow ? slowFrames + 1 : Math.max(0, slowFrames - 2);
  fastFrames = duration > 0 && duration < 0.021 && !cameraChanged ? fastFrames + 1 : 0;
  if (slowFrames >= 22 && resolutionLevel < scaleOptions.length - 1) {
    resolutionLevel += 1;
    slowFrames = 0;
    resize();
  } else if (fastFrames >= 240 && resolutionLevel > 0) {
    resolutionLevel -= 1;
    fastFrames = 0;
    resize();
  }
}

function animate(time) {
  draw(time);
  requestAnimationFrame(animate);
}

controls.querySelectorAll('[data-stop]').forEach((button) => {
  button.addEventListener('click', () => goToStop(button.dataset.stop));
});
function chooseMode(next) {
  if (viewTransfer) return;
  tapKeys.clear();
  if (next === 'walk') {
    if (mode === 'walk') endJourney();
    else returnToShore();
    return;
  }
  if (next !== mode) endJourney();
  if (next === 'flight') {
    beginAerial();
    return;
  }
  if (next === 'tour' && mode === 'tour') {
    cancelDocking();
    beginTourRejoin();
    return;
  }
  const dock = nearDockOnLand();
  if (dock && (next === 'tour' || next === 'boat')) {
    const boardGuide = dock === originDock && next === 'tour';
    const boatPose = boardGuide ? undefined : dock.berths[next === 'boat' ? 'fast' : 'wood'];
    transferView(() => switchMode(next,{ boardGuide,boatPose }));
  } else switchMode(next);
}

controls.querySelectorAll('.travel-modes [data-mode]').forEach((button) => {
  button.addEventListener('click', () => chooseMode(button.dataset.mode));
});
journeyStart.addEventListener('click',startJourney);
soundToggle.addEventListener('click',toggleSound);
journeyExit.addEventListener('click',() => {
  if (viewTransfer) return;
  endJourney();
  journeyStart.focus({ preventScroll:true });
});
for (const button of perspectiveButtons) {
  button.addEventListener('click', () => selectPerspective(button.dataset.perspective));
}
walkButton.addEventListener('click', () => chooseMode('walk'));
dockButton.addEventListener('click',useDock);
dockDestination.addEventListener('change',() => {
  const dock = docks.find(({ id }) => id === dockDestination.value);
  dockDestination.value = '';
  if (!dock || mode !== 'walk' || viewTransfer) return;
  endJourney();
  transferView(() => {
    cancelTransition();
    Object.assign(pose,dockShoreView(dock));
    cameraY = shoreSurfaceAt(pose.x,pose.t)+pose.lift;
    if (parkedVessel?.dock !== dock) parkedVessel = { dock,kind:'wood',pose:dock.berths.wood };
    setVesselVisibility();
    canvas.focus({ preventScroll:true });
    water.invalidate();
  });
});
voyageSelect.addEventListener('change', () => {
  if (viewTransfer) return;
  const chapter = cruiseChapters.find(({ id }) => id === voyageSelect.value);
  if (!chapter) return;
  endJourney();
  if (tourControl !== 'guided') voyagePaused = false;
  seekCruise(reducedMotion.matches && chapter.time === 0 ? CRUISE_BOARDING_TIME : chapter.time);
});
voyageToggle.addEventListener('click', () => {
  if (viewTransfer) return;
  if (tourControl !== 'guided') {
    chooseMode('tour');
    return;
  }
  if (cruiseTime >= CRUISE_DURATION) {
    if (journey) return;
    seekCruise(reducedMotion.matches ? CRUISE_BOARDING_TIME : 0);
    voyagePaused = false;
  } else {
    voyagePaused = !voyagePaused;
  }
  syncVoyageUI(sampleCruise(cruiseTime).chapter);
});

window.addEventListener('keydown', (event) => {
  const code = movementCode(event);
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const targetMode = modeShortcuts[code];
  const selecting = event.target === voyageSelect || event.target === dockDestination;
  if (code === 'KeyM' && !selecting && !soundToggle.disabled) {
    if (!event.repeat) toggleSound();
    event.preventDefault();
    return;
  }
  if (code === 'Digit4' && !selecting && !journeyStart.hidden) {
    if (!event.repeat) startJourney();
    event.preventDefault();
    return;
  }
  if (targetMode && !selecting) {
    if (!event.repeat) chooseMode(targetMode);
    event.preventDefault();
    return;
  }
  if (code === 'KeyF' && !selecting && !dockButton.hidden) {
    if (!event.repeat) useDock();
    event.preventDefault();
    return;
  }
  if (code === 'KeyC' && mode !== 'walk') {
    if (!event.repeat) selectPerspective(perspective === 'first' ? 'third' : 'first');
    event.preventDefault();
    return;
  }
  if (!movementKeys.has(code)) return;
  if (selecting && code.startsWith('Arrow')) return;
  if (journeyWalk()) return;
  if (mode !== 'flight' && (code === 'KeyQ' || code === 'KeyE')) return;
  if (!pressed.has(code)) pressed.set(code, 0);
  event.preventDefault();
});
window.addEventListener('keyup', (event) => {
  const code = movementCode(event);
  const duration = pressed.get(code);
  pressed.delete(code);
  if (duration !== undefined && !code.startsWith('Shift')) {
    queueDriveTap(arrowBindings[code] ?? code, 0.17 - duration);
  }
});
function clearInput() {
  pressed.clear();
  pointerKeys.clear();
  tapKeys.clear();
  for (const button of driveButtons) button.removeAttribute('data-driving');
  pointer = null;
}

window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  sceneAudio.setVisible(!document.hidden);
  if (document.hidden) clearInput();
  previousTime = 0;
});
window.addEventListener('pagehide', () => sceneAudio.setVisible(false));
window.addEventListener('pageshow', () => sceneAudio.setVisible(!document.hidden));

canvas.addEventListener('pointerdown', (event) => {
  if (viewTransfer || pointer || event.button !== 0) return;
  canvas.focus({ preventScroll: true });
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (pointer?.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (dx || dy) {
    cancelTransition();
    if (mode === 'flight' && perspective === 'first') {
      glance.yaw = clamp(glance.yaw-dx*0.0041,-cockpitYawLimit,cockpitYawLimit);
      glance.pitch = clamp(glance.pitch+dy*0.0041,-0.40,0.46);
    } else if (mode !== 'walk' || journeyWalk()) {
      glance.yaw = angleDelta(0, glance.yaw - dx*0.0041);
      glance.pitch = clamp(glance.pitch + dy*0.0041, -0.94, 0.67);
    } else {
      pose.yaw -= dx * 0.0041;
      pose.pitch = clamp(pose.pitch + dy * 0.0041, -1.35, 0.95);
    }
  }
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
canvas.addEventListener('lostpointercapture', (event) => {
  if (event.pointerId === pointer?.id) pointer = null;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (viewTransfer) return;
  const delta = event.deltaY * (event.deltaMode === 1 ? 17 : event.deltaMode === 2 ? 90 : 1);
  if (mode !== 'walk' && perspective === 'third') {
    chaseDistanceScale = clamp(chaseDistanceScale*Math.exp(delta*0.00125), 0.84, 1.85);
    return;
  }
  if (mode !== 'walk' || journeyWalk()) return;
  cancelTransition();
  move(clamp(-delta*0.018,-3.2,3.2), 0);
}, { passive: false });

driveButtons.forEach((button) => {
  const code = button.dataset.key;
  const release = (event, tap) => {
    const input = pointerKeys.get(event.pointerId);
    if (input?.button !== button) return;
    pointerKeys.delete(event.pointerId);
    button.removeAttribute('data-driving');
    if (tap) queueDriveTap(code, tapDuration - input.elapsed);
  };
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    button.setAttribute('data-driving', '');
    pointerKeys.set(event.pointerId, { code, button, elapsed: 0 });
  });
  button.addEventListener('pointerup', (event) => release(event, true));
  button.addEventListener('pointercancel', (event) => release(event, false));
  button.addEventListener('lostpointercapture', (event) => release(event, false));
  button.addEventListener('click', (event) => {
    if (event.detail === 0) queueDriveTap(code);
  });
});
window.addEventListener('resize', resize);
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  window.showRiverError('显卡上下文暂时中断，正在等待恢复。');
});
canvas.addEventListener('webglcontextrestored', () => {
  water.invalidate();
  loading.hidden = true;
});
reducedMotion.addEventListener('change', () => water.invalidate());

resize();
setVesselVisibility();
draw(performance.now());
loading.hidden = true;
controls.hidden = false;
journeyPanel.hidden = false;
soundToggle.hidden = false;
document.documentElement.dataset.scene = 'ready';
requestAnimationFrame(animate);
