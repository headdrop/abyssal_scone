/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export default (parent, child, checkSame = true) => {
	if (checkSame && parent === child) return true;
	if (child === null) return false;
	let node = child.parentNode;
	while (node) {
		if (node === parent) return true;
		if (node === null) return false;
		node = node.parentNode;
	}
	return false;
};
