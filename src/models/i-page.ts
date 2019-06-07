import { Dictionary } from 'lodash';

import { PageEvent } from 'typedoc/dist/lib/output/events';
import { NavigationItem } from 'typedoc/dist/lib/output/models/NavigationItem';
import { UrlMapping } from 'typedoc/dist/lib/output/models/UrlMapping';

export interface IPage {
	readonly title: string;
	readonly path: string;
	readonly url: string;

	getNavigationItem( page?: PageEvent ): NavigationItem;
	readonly urlMapping: UrlMapping;

	readonly parent?: IPage;
	addChild( name: string, tutorial: IPage ): void;
	removeChild( name: string ): void;
	hasChild( name: string ): boolean;
	getChild( name: string ): IPage;
	hasChildren(): boolean;
	getChildren(): Dictionary<IPage>;
}
