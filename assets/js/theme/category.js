import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import cartPreview from './global/cart-preview';
import { parseInt } from 'lodash';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
        // > oBundle Implementation.
        this.cartId = context.cartId;
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.arrangeFocusOnSortBy();
        // > oBundle implementation.
        this.initHoverEffect();
        this.initAddAllToCart();
        this.initRemoveAllFromCart();
        if (this.cartId) this.toggleRemoveAllFromCart(true);
        else this.toggleRemoveAllFromCart(false);

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initHoverEffect() {
        const cardFigures = document.querySelectorAll('.card-figure');
        cardFigures.forEach(cardFigure => {
            const imageElement = cardFigure.querySelector('.card-image');
            const defaultImage = imageElement.dataset.src;
            const secondaryImage = imageElement.dataset.hoverimage;
            cardFigure.addEventListener('mouseenter', () => {
                imageElement.src = secondaryImage;
            });
            cardFigure.addEventListener('mouseleave', () => {
                imageElement.src = defaultImage;
            });
        });
    }

    initAddAllToCart() {
        const addAllButton = document.querySelector('#add-all-items-button');
        addAllButton.addEventListener('click', async () => {
            const cartItems = this.createLineItems();
            if (!this.cartId) {
                const createdCart = await this.createCart('/api/storefront/carts', cartItems);
                this.cartId = createdCart.id;
                this.toggleRemoveAllFromCart(true);
            } else {
                await this.addItemsToCart('/api/storefront/carts', this.cartId, cartItems);
            }
            this.showMessage('Added all items in this category to cart.');
            cartPreview(this.context.secureBaseUrl, this.cartId);
        });
    }

    showMessage(message) {
        const paragraph = document.querySelector('.category-cart-message');
        paragraph.innerText = message;
        paragraph.style.opacity = 1;
        setTimeout(() => {
            paragraph.style.opacity = 0;
        }, 10000);
    }

    async addItemsToCart(url, cartId, cartItems) {
        try {
            const response = await fetch(`${url}/${cartId}/items`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cartItems),
            });
            return await response.json();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }

    createLineItems() {
        const products = document.querySelectorAll('.card');
        const cartItems = { lineItems: [] };
        products.forEach(product => {
            const lineItem = {
                quantity: 1,
                productId: parseInt(product.dataset.id),
            };
            cartItems.lineItems.push(lineItem);
        });
        return cartItems;
    }

    async createCart(url, cartItems) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cartItems),
            });
            return await response.json();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }

    initRemoveAllFromCart() {
        const removeAllButton = document.querySelector('#remove-all-items-button');
        if (removeAllButton) {
            removeAllButton.addEventListener('click', () => {
                this.deleteCart('/api/storefront/carts', this.cartId);
                this.cartId = null;
                this.showMessage('Emptied cart');
                cartPreview(this.context.secureBaseUrl, this.cartId);
                this.toggleRemoveAllFromCart(false);
            });
        }
    }

    async deleteCart(url, cartId) {
        try {
            await fetch(`${url}/${cartId}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        }
    }

    toggleRemoveAllFromCart(bool) {
        const removeAllButton = document.querySelector('#remove-all-items-button');
        if (bool) {
            removeAllButton.classList.remove('d-none');
        } else {
            removeAllButton.classList.add('d-none');
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
