import { assign, Dictionary, isEmpty, isNil } from 'lodash';
import { dirname, relative } from 'path';

import { PageEvent } from 'typedoc/dist/lib/output/events';
import { NavigationItem } from 'typedoc/dist/lib/output/models/NavigationItem';
import { UrlMapping } from 'typedoc/dist/lib/output/models/UrlMapping';

import { noExt } from '../utils';
import { IPage } from './i-page';

export abstract class APage implements IPage {
	public get path() {
		return this.url.endsWith( '/index.html' ) ?
			dirname( this.url ) :
			noExt( this.url );
	}

	public constructor(
		public readonly title: string,
		public readonly url: string,
		public readonly template: string,
		public readonly parent?: IPage,
		private readonly navItemTransform?: ( page: PageEvent, navItem: NavigationItem ) => NavigationItem,
	) {
		if ( parent ) {
			parent.addChild( relative( parent.path, noExt( url ) ), this );
		}
	}

	// #region parent/children
	private readonly _children: Dictionary<IPage> = {};
	public addChild( name: string, tutorial: IPage ): void {
		if ( this.hasChild( name ) ) {
			throw new Error( `Can't replace an existing child ${name}` );
		}
		this._children[name] = tutorial;
	}
	public removeChild( name: string ): void {
		if ( !this.hasChild( name ) ) {
			throw new Error( `Can't remove a non existing child ${name}` );
		}
		delete this._children[name];
	}
	public hasChild( name: string ): boolean {
		return !isNil( this._children[name] );
	}
	public getChild( name: string ): IPage {
		if ( !this.hasChild( name ) ) {
			throw new Error();
		}
		return this._children[name];
	}
	public hasChildren(): boolean {
		return !isEmpty( this._children );
	}
	public getChildren(): Dictionary<IPage> {
		if ( !this.hasChildren() ) {
			throw new Error();
		}
		return assign( {}, this._children );
	}
	// #endregion

	// #region model
	private _model?: object;
	protected get model() {
		if ( isNil( this._model ) ) {
			const partialModel = this.generateModel();

			this._model = {
				name: this.title,

				...partialModel,
			};
		}
		return this._model;
	}
	protected abstract generateModel(): object;
	// #endregion

	// #region url mapping
	private _urlMapping?: UrlMapping;
	public get urlMapping() {
		if ( isNil( this._urlMapping ) ) {
			this._urlMapping = new UrlMapping( this.url, this.model, this.template );
		}
		return this._urlMapping;
	}
	// #endregion

	// #region navigation item
	private _navigationItem?: NavigationItem;
	public getNavigationItem( page?: PageEvent ) {
		if ( isNil( this._navigationItem ) ) {
			this._navigationItem = new NavigationItem( this.title, this.url, this.parent ? this.parent.getNavigationItem( page ) : undefined );
			// Initialize all children navs
			Object.values( this._children )
				.map( child => child.getNavigationItem( page ) );
		}

		// Apply the page transforms
		if ( this.navItemTransform && page ) {
			this._navigationItem = this.navItemTransform( page, this._navigationItem );
		}
		return this._navigationItem;
	}
	// #endregion
}
