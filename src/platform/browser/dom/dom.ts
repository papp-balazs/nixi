import {
	ADD_NODE,
	REMOVE_NODE,
	REPLACE_NODE,
	ADD_ATTRIBUTE,
	REMOVE_ATTRIBUTE,
	REPLACE_ATTRIBUTE,
	VirtualNode,
	VirtualDOMDiff,
	getVirtualDOMDiff,
	isTagVirtualNode,
	getAttribute,
} from "@core/vdom";
import { isArray, isFunction, isUndefined } from "@helpers";
import { getAppUID, getRegistery } from "@core/scope";
import { delegateEvent } from "../events/events";

type ProcessDOMOptions = {
	vNode: VirtualNode;
	nextVNode: VirtualNode;
	container?: HTMLElement;
};

function mountDOM(
	vdom: VirtualNode | VirtualNode[],
	rootNode: HTMLElement,
	parentNode: HTMLElement = null
): HTMLElement | Text | Comment {
	let container: HTMLElement | Text | Comment | null = parentNode || null;
	const uid = getAppUID();
	const app = getRegistery().get(uid);
	const mapVDOM = (vNode: VirtualNode) => {
		if (!vNode) {
			return;
		}

		const isContainerExists =
			Boolean(container) && container.nodeType === Node.ELEMENT_NODE;

		if (vNode.type === "TAG") {
			const DOMElement = document.createElement(vNode.name);
			const mapAttrs = (attrName: string) => {
				!isFunction(getAttribute(vNode, attrName)) &&
					DOMElement.setAttribute(attrName, vNode.attrs[attrName]);

				if (/^on/.test(attrName)) {
					const eventName = attrName.slice(2, attrName.length).toLowerCase();
					const handler = getAttribute(vNode, attrName);

					app.queue.push(() =>
						delegateEvent(uid, rootNode, DOMElement, eventName, handler)
					);
				}
			};

			Object.keys(vNode.attrs).forEach(mapAttrs);

			if (isContainerExists) {
				container.appendChild(DOMElement);

				if (!vNode.isVoid) {
					const node = mountDOM(
						vNode.children,
						rootNode,
						DOMElement
					) as HTMLElement;
					container.appendChild(node);
				}
			} else {
				const node = mountDOM(
					vNode.children,
					rootNode,
					DOMElement
				) as HTMLElement;
				container = node;
			}
		} else if (vNode.type === "TEXT") {
			const textNode = document.createTextNode(vNode.text);

			if (isContainerExists) {
				container.appendChild(textNode);
			} else {
				container = textNode;
			}
		} else if (vNode.type === "COMMENT") {
			const commentNode = document.createComment(vNode.text);

			if (isContainerExists) {
				container.appendChild(commentNode);
			} else {
				container = commentNode;
			}
		}
	};
	const mapVNodeFn = (vNode: VirtualNode) => mapVDOM(vNode);

	if (isArray(vdom)) {
		(vdom as Array<VirtualNode>).forEach(mapVNodeFn);
	} else {
		mapVDOM(vdom as VirtualNode);
	}

	return container;
}

function getDOMElementRoute(
	sourceDOMElement: HTMLElement,
	targetDOMElement: HTMLElement,
	prevRoute: number[] = [],
	level: number = 0,
	idx: number = 0,
	stop: boolean = false
): [number[], boolean] {
	const children = Array.from(sourceDOMElement.childNodes);
	let route = [...prevRoute];

	route[level] = idx;
	level++;

	if (targetDOMElement === sourceDOMElement) {
		route = route.slice(0, level);

		return [route, true];
	}

	for (let i = 0; i < children.length; i++) {
		const childSourceDOMElement = sourceDOMElement.childNodes[i] as HTMLElement;
		const [nextRoute, nextStop] = getDOMElementRoute(
			childSourceDOMElement,
			targetDOMElement,
			route,
			level,
			i,
			stop
		);

		if (nextStop) {
			return [nextRoute, nextStop];
		}
	}

	return [route, stop];
}

function getNodeByDiffElememt(
	parentNode: HTMLElement,
	diffElement: VirtualDOMDiff
) {
	let node = parentNode;
	const { action, route, oldValue, nextValue } = diffElement;
	const isRoot = route.length === 1;

	if (isRoot) {
		const isVNodeTag = isTagVirtualNode(oldValue as VirtualNode);
		const isNextVNodeTag = isTagVirtualNode(nextValue as VirtualNode);

		if ((!isVNodeTag && isNextVNodeTag) || (!isVNodeTag && !isNextVNodeTag)) {
			node = node.childNodes[0] as HTMLElement;
		}

		return node;
	}

	const mapRoute = (routeID: number, idx: number, arr: number[]) => {
		if (idx > 0) {
			if (action === ADD_NODE && idx === arr.length - 1) {
				return;
			}

			if (action === REMOVE_NODE) {
				node = (node.childNodes[routeID] ||
					node.childNodes[node.childNodes.length - 1]) as HTMLElement;
				return;
			}

			node = node.childNodes[routeID] as HTMLElement;
		}
	};

	route.forEach(mapRoute);

	return node;
}

function getDOMElementByRoute(
	parentNode: HTMLElement,
	route: number[] = []
): HTMLElement {
	let node = parentNode;
	const mapRoute = (cIdx: number, idx: number) =>
		idx === 0
			? node
			: (node = node ? (node.childNodes[cIdx] as HTMLElement) : node);

	route.forEach(mapRoute);

	return node;
}

function patchDOM(diff: VirtualDOMDiff[], rootElement: HTMLElement) {
	const mapDiff = (diffElement: VirtualDOMDiff) => {
		const node = getNodeByDiffElememt(rootElement, diffElement);

		if (diffElement.action === ADD_NODE) {
			const newNode = mountDOM(
				diffElement.nextValue as VirtualNode,
				rootElement
			);
			node.appendChild(newNode);
		} else if (diffElement.action === REMOVE_NODE) {
			node.parentNode.removeChild(node);
		} else if (diffElement.action === REPLACE_NODE) {
			const newNode = mountDOM(
				diffElement.nextValue as VirtualNode,
				rootElement
			);
			node.replaceWith(newNode);
		} else if (diffElement.action === ADD_ATTRIBUTE) {
			const attrValueBlackList = [];
			const mapAttrs = (attrName: string) =>
				!attrValueBlackList.includes(diffElement.nextValue[attrName]) &&
				node.setAttribute(attrName, diffElement.nextValue[attrName]);

			Object.keys(diffElement.nextValue).forEach(mapAttrs);
		} else if (diffElement.action === REMOVE_ATTRIBUTE) {
			const mapAttrs = (attrName: string) => node.removeAttribute(attrName);
			Object.keys(diffElement.oldValue).forEach(mapAttrs);
		} else if (diffElement.action === REPLACE_ATTRIBUTE) {
			const mapAttrs = (attrName: string) => {
				const value = diffElement.nextValue[attrName];

				!isFunction(value) &&
					!isUndefined(value) &&
					node.setAttribute(attrName, value);

				if (node.nodeName.toLowerCase() === "input") {
					const input = node as HTMLInputElement;
					const inputType = input.type.toLowerCase();

					if (inputType === "text" && attrName === "value") {
						input.value = value;
					} else if (inputType === "checkbox" && attrName === "checked") {
						input.checked = value;
					}
				}
			};

			Object.keys(diffElement.nextValue).forEach(mapAttrs);
		}
	};

	diff.forEach(mapDiff);
}

function processDOM({
	vNode = null,
	nextVNode = null,
	container = null,
}: ProcessDOMOptions) {
	const uid = getAppUID();
	const app = getRegistery().get(uid);
	const getDOMElement = () => container || app.nativeElement;
	const DOMElement = getDOMElement();
	let diff = [];

	diff = getVirtualDOMDiff(vNode, nextVNode);

	patchDOM(diff, DOMElement);

	app.queue.forEach((fn) => fn());
	app.queue = [];
	app.vdom = nextVNode;

	console.log("app.eventHandlers: ", app.eventHandlers);
}

export {
	mountDOM,
	getDOMElementRoute,
	getDOMElementByRoute,
	patchDOM,
	processDOM,
};
