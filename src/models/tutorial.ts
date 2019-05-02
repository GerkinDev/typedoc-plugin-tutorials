import { ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
import { NavigationItem } from 'typedoc/dist/lib/output/models/NavigationItem';
import { UrlMapping } from 'typedoc/dist/lib/output/models/UrlMapping';

import { readFileSync } from 'fs';
import { assign, isEmpty, isNil, isString } from 'lodash';

import { IDescriptionResolved } from '../components/tutorials-scanner-component';
import { APage } from './a-page';
import { IPage } from './i-page';

export class Tutorial extends APage {
	public readonly source: string;
	public readonly description?: string;

	public constructor( config: IDescriptionResolved, public readonly parent: IPage, relativeName: string ) {
		super(
			config.title,
			[ parent.path, ...( config.children ? [relativeName, 'index.html'] : [`${relativeName}.html`] ) ].join( '/' ),
			'index.hbs',
			parent,
			( page, nav ) => assign( nav, { isVisible: true } ) );
		this.source = config.source;
		this.description = config.description;

		if ( config.children ) {
			Object.entries( config.children )
				.forEach( ( [subName, subConf] ) => new Tutorial( subConf, this, subName ) );
		}
	}

	public static makeDefaultTagLink( id: string, summary?: string ) {
		const head = `<h4 style="display:inline-block;">Missing tutorial <code>${id}</code></h4>`;

		if ( summary ) {
			return `<details open><summary>${head}</summary>${summary}</details>`;
		} else {
			return head;
		}
	}

	public makeTagLink( summary?: string ) {
		const renderer: ContextAwareRendererComponent | undefined = undefined as ContextAwareRendererComponent | undefined;
		const tutoLink = renderer ?
			// TODO URL resolve
			`<h4 style="display:inline-block;"><a href="${ renderer.getRelativeUrl( this.url ) }">${this.title}</a></h4>` :
			`<h4 style="display:inline-block;">Unresolvable tutorial <code>${this.title}</code></h4>`;

		if ( summary ) {
			return `<details open><summary>${tutoLink}</summary>${summary}</details>`;
		} else {
			return tutoLink;
		}
	}

	protected generateModel() {
		const content = readFileSync( this.source, 'utf-8' );

		const subMenu = this.hasChildren() ? Object.values( this.getChildren() )
				.map( subTuto => ` * [${subTuto.title}](#)` )
				.join( '\n' ) : false;

		const fullContent = subMenu ?
			`${content}\n\n-----\n\n${subMenu}` :
			content;

		return {
			readme: fullContent,
		};
	}
}
