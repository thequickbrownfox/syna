import $ from './helpers/jq-helpers';
import Validator from 'form-validator-simple';

function initFormValidation(form, onSuccess = () => false) {
  new Validator({
    errorTemplate: '<span class="help-block form-error">%s</span>',
    onFormValidate: (isFormValid, form) => {
      form.querySelector('button').disabled = !isFormValid
    },
    onError: function(e, form) {
      form.querySelector('.generic-error').removeClass('d-none');
    },
    onSuccess,
    form,
  });
}

function onSubmit(id) {
  return function(e) {
    e.preventDefault();

    const config = window.syna.api.get('stripe', id);
    stripe.createToken(card).then(result => {
      if (result.error) {
        $('.invalid-feedback').text(result.error.message);
      } else {
        const action = form.attr('action');
        const serializedForm = JSON.parse(form.serialize(true));
        serializedForm.stripeToken = result.token.id;
        serializedForm.price = parseInt(config.price.match(/\w+/g).reduce((tmp, match) => tmp + match, ''), 10);
        serializedForm.currency = config.currency;
        $.post(action, JSON.stringify(serializedForm))
          .then(() => form.$('#generic-success').removeClass('d-none'))
          .catch(() => form.$('#generic-error').removeClass('d-none'));
      }
    });
  }
}

window.syna.api.toArray('stripe').forEach(config => {
  const stripe = Stripe(config.token);
  const elements = stripe.elements();
  const card = elements.create('card', config.options);
  card.mount(`${config.form} #card-element`);
  card.addEventListener('change', e => {
    const displayError = $('.invalid-feedback');
    if (event.error) {
      displayError.text(event.error.message);
    } else {
      displayError.text('');
    }
  });

  const form = $(config.form);
  initFormValidation(form[0], onSubmit);
});

window.syna.stream.subscribe('topic.pricing.change', function(product, price) {
  window.syna.api.toArray('stripe').forEach(config => {
    config.price = price;
    $('[data-render-price]').text(price)
  })
});
