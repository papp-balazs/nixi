import { isEmpty } from "@helpers";
import { ATTR_KEY } from "@core/constants";

type VirtualNodeType = "TAG" | "TEXT" | "COMMENT";

export type VirtualNode = {
	isVirtualNode: boolean;
	type: VirtualNodeType;
	id: string;
	name?: string;
	isVoid?: boolean;
	attrs?: Record<string, string>;
	text?: string;
	children: Array<VirtualNode>;
	route: Array<number>;
	processed: boolean;
};

export type ViewDefinition = {
	as: string;
	children?: Array<any>;
	isVoid?: boolean;
	[prop: string]: any;
};

const EMPTY_NODE = "nixi:empty";

function createVirtualNode(
	type: VirtualNodeType,
	config: Partial<VirtualNode> = {}
) {
	return {
		isVirtualNode: true,
		id: "",
		name: null,
		isVoid: false,
		attrs: {},
		text: "",
		children: [],
		route: [],
		processed: false,
		...config,
		type,
	};
}

function createVirtualTagNode(config: Partial<VirtualNode>): VirtualNode {
	return createVirtualNode("TAG", { ...config });
}

function createVirtualTextNode(text: string): VirtualNode {
	return createVirtualNode("TEXT", {
		isVoid: true,
		text,
	});
}

function createVirtualCommentNode(text: string): VirtualNode {
	return createVirtualNode("COMMENT", {
		isVoid: true,
		text,
	});
}

function createVirtualEmptyNode(): VirtualNode {
	return createVirtualCommentNode(EMPTY_NODE);
}

const Text = (str: string) => createVirtualTextNode(str);
const Comment = (str: string) => createVirtualCommentNode(str);
const View = (def: ViewDefinition) => {
	const { as, child, children, isVoid = false, ...rest } = def;

	return createVirtualTagNode({
		name: as,
		isVoid,
		attrs: { ...rest },
		children: isVoid ? [] : children || [],
	});
};

function isTagVirtualNode(vNode: VirtualNode): boolean {
	return vNode.type === "TAG";
}

function createAttribute(name: string, value: string | number | boolean) {
	return { [name]: value };
}

function getAttribute(vNode: VirtualNode, attrName: string): any {
	return vNode && vNode.type === "TAG" && !isEmpty(vNode.attrs[attrName])
		? vNode.attrs[attrName]
		: undefined;
}

function setAttribute(vNode: VirtualNode, name: string, value: any) {
	vNode.type === "TAG" && (vNode.attrs[name] = value);
}

function removeAttribute(vNode: VirtualNode, name: string) {
	vNode.type === "TAG" && delete vNode.attrs[name];
}

function getNodeKey(vNode: VirtualNode): string {
	return getAttribute(vNode, ATTR_KEY);
}

export {
	createVirtualNode,
	createVirtualTextNode,
	createVirtualCommentNode,
	createVirtualEmptyNode,
	Text,
	Comment,
	View,
	isTagVirtualNode,
	createAttribute,
	getAttribute,
	setAttribute,
	removeAttribute,
	getNodeKey,
	EMPTY_NODE,
};
