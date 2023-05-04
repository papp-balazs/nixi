import { mount, StatelessComponentFactoryType, VirtualNode } from "@core";

function renderComponent(
	vdom: VirtualNode | StatelessComponentFactoryType,
	container: HTMLElement | null,
	onRender?: Function
) {
	const mounted = mount(vdom);

	console.log("mounted: ", mounted);
	console.log("vdom: ", vdom);
}

export { renderComponent };
