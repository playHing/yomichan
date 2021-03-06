/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*global apiFrameInformationGet, FrontendApiReceiver, Popup*/

class PopupProxyHost {
    constructor() {
        this._popups = new Map();
        this._nextId = 0;
        this._apiReceiver = null;
        this._frameIdPromise = null;
    }

    // Public functions

    async prepare() {
        this._frameIdPromise = apiFrameInformationGet();
        const {frameId} = await this._frameIdPromise;
        if (typeof frameId !== 'number') { return; }

        this._apiReceiver = new FrontendApiReceiver(`popup-proxy-host#${frameId}`, new Map([
            ['getOrCreatePopup', this._onApiGetOrCreatePopup.bind(this)],
            ['setOptions', this._onApiSetOptions.bind(this)],
            ['hide', this._onApiHide.bind(this)],
            ['isVisible', this._onApiIsVisibleAsync.bind(this)],
            ['setVisibleOverride', this._onApiSetVisibleOverride.bind(this)],
            ['containsPoint', this._onApiContainsPoint.bind(this)],
            ['showContent', this._onApiShowContent.bind(this)],
            ['setCustomCss', this._onApiSetCustomCss.bind(this)],
            ['clearAutoPlayTimer', this._onApiClearAutoPlayTimer.bind(this)],
            ['setContentScale', this._onApiSetContentScale.bind(this)]
        ]));
    }

    getOrCreatePopup(id=null, parentId=null, depth=null) {
        // Find by existing id
        if (id !== null) {
            const popup = this._popups.get(id);
            if (typeof popup !== 'undefined') {
                return popup;
            }
        }

        // Find by existing parent id
        let parent = null;
        if (parentId !== null) {
            parent = this._popups.get(parentId);
            if (typeof parent !== 'undefined') {
                const popup = parent.child;
                if (popup !== null) {
                    return popup;
                }
            } else {
                parent = null;
            }
        }

        // New unique id
        if (id === null) {
            id = this._nextId++;
        }

        // Create new popup
        if (parent !== null) {
            if (depth !== null) {
                throw new Error('Depth cannot be set when parent exists');
            }
            depth = parent.depth + 1;
        } else if (depth === null) {
            depth = 0;
        }
        const popup = new Popup(id, depth, this._frameIdPromise);
        if (parent !== null) {
            popup.setParent(parent);
        }
        this._popups.set(id, popup);
        return popup;
    }

    // Message handlers

    async _onApiGetOrCreatePopup({id, parentId}) {
        const popup = this.getOrCreatePopup(id, parentId);
        return {
            id: popup.id
        };
    }

    async _onApiSetOptions({id, options}) {
        const popup = this._getPopup(id);
        return await popup.setOptions(options);
    }

    async _onApiHide({id, changeFocus}) {
        const popup = this._getPopup(id);
        return popup.hide(changeFocus);
    }

    async _onApiIsVisibleAsync({id}) {
        const popup = this._getPopup(id);
        return await popup.isVisible();
    }

    async _onApiSetVisibleOverride({id, visible}) {
        const popup = this._getPopup(id);
        return await popup.setVisibleOverride(visible);
    }

    async _onApiContainsPoint({id, x, y}) {
        const popup = this._getPopup(id);
        [x, y] = PopupProxyHost._convertPopupPointToRootPagePoint(popup, x, y);
        return await popup.containsPoint(x, y);
    }

    async _onApiShowContent({id, elementRect, writingMode, type, details}) {
        const popup = this._getPopup(id);
        elementRect = PopupProxyHost._convertJsonRectToDOMRect(popup, elementRect);
        if (!PopupProxyHost._popupCanShow(popup)) { return; }
        return await popup.showContent(elementRect, writingMode, type, details);
    }

    async _onApiSetCustomCss({id, css}) {
        const popup = this._getPopup(id);
        return popup.setCustomCss(css);
    }

    async _onApiClearAutoPlayTimer({id}) {
        const popup = this._getPopup(id);
        return popup.clearAutoPlayTimer();
    }

    async _onApiSetContentScale({id, scale}) {
        const popup = this._getPopup(id);
        return popup.setContentScale(scale);
    }

    // Private functions

    _getPopup(id) {
        const popup = this._popups.get(id);
        if (typeof popup === 'undefined') {
            throw new Error(`Invalid popup ID ${id}`);
        }
        return popup;
    }

    static _convertJsonRectToDOMRect(popup, jsonRect) {
        const [x, y] = PopupProxyHost._convertPopupPointToRootPagePoint(popup, jsonRect.x, jsonRect.y);
        return new DOMRect(x, y, jsonRect.width, jsonRect.height);
    }

    static _convertPopupPointToRootPagePoint(popup, x, y) {
        if (popup.parent !== null) {
            const popupRect = popup.parent.getContainerRect();
            x += popupRect.x;
            y += popupRect.y;
        }
        return [x, y];
    }

    static _popupCanShow(popup) {
        return popup.parent === null || popup.parent.isVisibleSync();
    }
}
