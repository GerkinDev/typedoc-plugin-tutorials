import { assign, Dictionary, forEach, values } from 'lodash';

import { Application } from 'typedoc/dist/lib/application';

import { IDescriptionResolved } from '../components/tutorials-scanner-component';
import { APage } from './a-page';
import { IPage } from './i-page';
import { Tutorial } from './tutorial';

export interface ITutorialTreeItem {
	title: string;
	description?: string;
	dest: string;
	children?: ITutorialTreeItem[];
}
export class TutorialIndex extends APage {
	public constructor( tutorials: Dictionary<IDescriptionResolved>, app: Application ) {
		super( 'Tutorial index', 'tutorials/index.html', 'tutorial-index.hbs', app, undefined, ( page, nav ) => assign( nav, { isVisible: true } ) );
		forEach( tutorials, ( tutorial, relativePath ) => new Tutorial( tutorial, this, relativePath, app ) );
	}

	private static asSimpleTree( page: IPage ): ITutorialTreeItem[] | undefined {
		return page.hasChildren() ? values( page.getChildren() ).map( child => ( {
			children: this.asSimpleTree( child ),
			description: child instanceof Tutorial ? child.description : undefined,
			dest: child.url,
			title: child.title,
		} ) ) : undefined;
	}

	protected generateModel() {
		return {
			intro: 'Welcome to the tutorials index.',
			tutorials: TutorialIndex.asSimpleTree( this ),
		};
	}
}
