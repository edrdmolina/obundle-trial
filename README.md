# oBundle BigCommerce Assessment For New Candidates
Completed by Eduardo Molina.

[Storefront Preview Link](https://bigcommercetrialstore-f8.mybigcommerce.com/?ctk=75854849-0d7c-416a-b446-d1e7032527c4).

preview code: nlcsayf4t6

If you wish to log in without having to create an account.You may use the account I have already created.

email: edmolina.solutions@gmail.com
password: Password123?

<hr>

## Table of Contents

1. [Task 1](#task1)
    - Create Special Items Category and Special Item product inside category with two product pictures.
2. [Task 2](#task2)
    - Implement hover over product and change product image to secondary product image effect.
3. [Task 3](#task3)
    - Implement add entire category page to cart button, and empty cart button inside the category page.
4. [Bonus Task](#bonusTask)
    - Show Logged In customer details on the category page.

<hr>

<h2 id="task1">Task #1</h2>
Create a product called Special Item which will be assigned to a new category called Special Items. Be sure to add at least 2 images during the product creation.

### Implementation:
First, I created a new category by logging into the storefront dashboard and directing to Products > Product Categories and clicking Create A Category.

Second, I directed to Products > Add, filled out the form, added two images, and selected the newly created category.

<hr>

<h2 id="task2">Task #2</h2>
Create a feature that will show the product's second image when it is hovered on.

### Implementation:

Using The Handlebars Helpers provided by BigCommerce in their [documentation](https://developer.bigcommerce.com/stencil-docs/ZG9jOjIyMDcxOA-handlebars-helpers-reference). I used the getImage helper to load the default image and secondary image into separate data attributes.

[./templates/components/products/card.html](templates/components/products/card.html) lines 71-78
```html
<img class="card-image lazyload"
    data-sizes="auto"
    src="{{cdn 'img/loading.svg'}}" 
    alt="{{image.alt}}" 
    title="{{image.alt}}"
    data-src="{{getImage image}}"
    data-hoverimage="{{#replace '{:size}' images.1.data}}500x659{{/replace}}{{getImage images.1.data 'productgallery_size' (cdn theme_settings.default_image_product)}}"
/>
```


Then I created a function to initiate the hover effect with event listeners.

On every page load we search for all tags with the card-figure class attribute and store them into the cardFigures array.

I then added an event listener to each card-figure to update the img src attribute when entering and exiting with the mouse.

[./assets/js/theme/category.js](assets/js/theme/category.js) lines 74-87
```js
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
```

lastly, I called the initHoverEffect function in the onReady method of the Category class.

<hr>

<h2 id="task3">Task #3</h2>

Add a button at the top of the category page labeled Add All To Cart. When clicked, the product will be added to the cart. Notify the user that the product has been added.
If the cart has an item in it - show a button next to the Add All To Cart button which says Remove All Items. When clicked it should clear the cart and notify the user.
Both buttons should utilize the Storefront API for completion. 

### Implementation:

1. Add a container with two button tags and a paragraph tag inside the page-content class tag.

    [templates/pages/category.html](templates/pages/category.html) lines 52-68
    ``` html
    <div class="page-content" id="product-listing-container">
        {{#if customer}}
        <div class="banner">
            <p>Customer Name: {{customer.name}}</p>
            <p>Customer Email: {{customer.email}}</p>
            {{#if customer.phone}}
                <p>Customer Phone: {{customer.phone}}</p>
            {{/if}}
        </div>
        {{/if}}
        <p class="category-cart-message"></p>
        <div class="category-cart-buttons">
            <button class="button button--small" id="add-all-items-button">Add All To Cart</button>    
            <button class="button button--small d-none" id="remove-all-items-button">Remove All Items</button>
        </div>
        {{> components/category/product-listing}}
        {{{region name="category_below_content"}}}
    </div>
    ```

2. Create function to initialize the Add All To Cart button. function finds the button on the DOM and adds an event listener. If the cart is empty it will create a new cart and add all items in it. 

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 82-96
    ``` js
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
    ```
3. In order to add the entire category of products, I had to create an object with an array of objects named lineItems with the product id and quantity. First I created an array of all the article tags with card classes inside the category page. Inside each article tag I added a data attribute with the product id. Finally I return the array of cartItems.

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 125-136
    ``` js
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
    ```
    [templates/components/products/card.html](templates/components/products/card.html) lines 1-3
    ``` html
    <article
        class="card"
        data-id={{id}}

    etc...
    ```
4. In the case where the cart was already empty, we create a new cart with the createCart function by sending a POST request to the storefront API with the cartItems object created with the createLineItems function.

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 138-154
    ``` js
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
    ```
5. In the case where there are already items in a cart, we add the items to the cart by sending a POST request to the Storefront API with the cartItems object created with the createLineItems function AND the cartId.

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 107-123
    ``` js
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
    ```
6. For the Remove All Items button I also had to initiate the on click event listener. 

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 156-167
    ``` js
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
    ```
    Once the Remove All Items button is clicked it will delete the cart by sending a DELETE request to the Storefront API with the cartId. Then it will remove the cartId from the Category class constructor. 

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 169-183
    ``` js
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
    ```
7. After clicking either button, the show message function will be called showing a paragraph above the buttons making it aware to the customer of the action he just initiated. After 10 seconds it will disappear.

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 98-105
    ``` js
    showMessage(message) {
        const paragraph = document.querySelector('.category-cart-message');
        paragraph.innerText = message;
        paragraph.style.opacity = 1;
        setTimeout(() => {
            paragraph.style.opacity = 0;
        }, 10000);
    }
    ```

8. After clicking either button it will toggle the Remove All Items button from the DOM. If the Add All Items button is clicked for the first time, the Remove All Items buttons will appear. Otherwise, The Remove All Items will disappear.

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 185-192
    ``` js
    toggleRemoveAllFromCart(bool) {
        const removeAllButton = document.querySelector('#remove-all-items-button');
        if (bool) {
            removeAllButton.classList.remove('d-none');
        } else {
            removeAllButton.classList.add('d-none');
        }
    }
    ```
9. After clicking either button, the cartPreview function from [./assets/js/theme/global/cart-preview.js](assets/js/theme/global/cart-preview.js) is called in order to reload the cart item quantity and cart preview from the top right corner of the screen.

10. Finally The buttons are and the hover effect is initialized in the onReady method.

    [./assets/js/theme/category.js](assets/js/theme/category.js) lines 37-41
    ```js
    this.initHoverEffect();
    this.initAddAllToCart();
    this.initRemoveAllFromCart();
    if (this.cartId) this.toggleRemoveAllFromCart(true);
    else this.toggleRemoveAllFromCart(false);
    ```

<hr>

<h2 id="bonusTask">Bonus Task</h2>

If a customer is logged in - at the top of the category page show a banner that shows some customer details (i.e. name, email, phone, etc). This should utilize the data that is rendered via Handlebars on the Customer Object. 

### Implementation: 

Since The customer Object is always included and is available when an active shopper is logged in (as per [Documentation](https://developer.bigcommerce.com/stencil-docs/ZG9jOjIyMDcxNg-front-matter-reference)). I was able to use Handlebars JS to set a conditional for the customer object. If true, it would generate a div with customer data. Since the Phone data is not required for a customer account, I created a conditional in order to check if it were available.

[templates/pages/category.html](templates/pages/category.html) lines 52-60
``` html
{{#if customer}}
    <div class="banner">
        <p>Customer Name: {{customer.name}}</p>
        <p>Customer Email: {{customer.email}}</p>
        {{#if customer.phone}}
            <p>Customer Phone: {{customer.phone}}</p>
        {{/if}}
    </div>
{{/if}}
```
