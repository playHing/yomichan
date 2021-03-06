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


class DisplayContext {
    constructor(type, definitions, context) {
        this.type = type;
        this.definitions = definitions;
        this.context = context;
    }

    get(key) {
        return this.context[key];
    }

    set(key, value) {
        this.context[key] = value;
    }

    update(data) {
        Object.assign(this.context, data);
    }

    get previous() {
        return this.context.previous;
    }

    get next() {
        return this.context.next;
    }

    static push(self, type, definitions, context) {
        const newContext = new DisplayContext(type, definitions, context);
        if (self !== null) {
            newContext.update({previous: self});
            self.update({next: newContext});
        }
        return newContext;
    }
}
