import React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { stripesConnect } from '@folio/stripes/core';
import ReserveForm from '../components/ReserveForm';
import NoPermissions from '../components/NoPermissions';
import fetchIsPending from '../util/fetchIsPending';

class EditReserveRoute extends React.Component {
  static manifest = Object.freeze({
    reserve: {
      type: 'okapi',
      path: 'coursereserves/courselistings/:{clid}/reserves/:{id}',
    },
    item: {
      type: 'okapi',
      path: (_q, _p, _r, _l, props) => {
        const reserve = get(props.resources, 'reserve.records.0');
        console.log('item path function, props =', props);
        if (!reserve) return null;
        console.log(' item path function returning', `inventory/items/${reserve.itemId}`);
        return `inventory/items/${reserve.itemId}`;
      },
    },
    loanTypes: {
      type: 'okapi',
      path: 'loan-types',
      // records: 'loantypes',
    },
    processingStatuses: {
      type: 'okapi',
      path: 'coursereserves/processingstatuses',
    },
    locations: {
      type: 'okapi',
      path: 'locations',
      shouldRefresh: () => false,
    },
    copyrightStatuses: {
      type: 'okapi',
      path: 'coursereserves/copyrightstatuses',
    },
  });

  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
    }).isRequired,
    location: PropTypes.shape({
      search: PropTypes.string.isRequired,
    }).isRequired,
    match: PropTypes.shape({
      params: PropTypes.shape({
        id: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    resources: PropTypes.shape({
      reserve: PropTypes.object,
      item: PropTypes.object,
      loanTypes: PropTypes.object,
      processingStatuses: PropTypes.object,
      locations: PropTypes.object,
      copyrightStatuses: PropTypes.object,
    }).isRequired,
    mutator: PropTypes.shape({
      reserve: PropTypes.shape({
        PUT: PropTypes.func.isRequired,
      }).isRequired,
      item: PropTypes.shape({
        PUT: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
    stripes: PropTypes.shape({
      hasPerm: PropTypes.func.isRequired,
    }).isRequired,
  };

  getInitialValues = () => {
    const reserve = get(this.props.resources, 'reserve.records[0]', {});
    const item = get(this.props.resources, 'item.records[0]', {});

    const values = cloneDeep(reserve);
    values.temporaryLocationId = item.temporaryLocationId;
    return values;
  }

  handleClose = () => {
    const { location, match } = this.props;
    this.props.history.push(`/cr/courses/${match.params.cid}${location.search}`);
  }

  handleSubmit = (reserve) => {
    const temporaryLocationId = reserve.temporaryLocationId;
    delete reserve.temporaryLocationId;

    console.log('handleSubmit: props =', this.props);
    this.props.mutator.reserve.PUT(reserve)
      .then(() => {
        console.log('PUT to item mutator');
        this.props.mutator.item.PUT({ temporaryLocationId });
      })
      .then(this.handleClose);
  }

  getOptions(resource, element) {
    return get(this.props.resources, `${resource}.records.0.${element || resource}`, [])
      .map(x => ({ value: x.id, label: x.name }));
  }

  render() {
    const { resources, stripes } = this.props;
    console.log('render');

    if (!stripes.hasPerm('course-reserves-storage.reserves.write')) return <NoPermissions />;

    return (
      <ReserveForm
        data={{
          reserve: get(resources, 'reserve.records.0'),
          item: get(resources, 'item.records.0'),
          loanTypes: this.getOptions('loanTypes', 'loantypes'),
          processingStatuses: this.getOptions('processingStatuses'),
          locations: this.getOptions('locations'),
          copyrightStatuses: [{
            value: '',
            label: '(None required)',
          }].concat(this.getOptions('copyrightStatuses')),
        }}
        handlers={{ onClose: this.handleClose }}
        initialValues={this.getInitialValues()}
        isLoading={fetchIsPending(this.props.resources)}
        onSubmit={this.handleSubmit}
      />
    );
  }
}

export default stripesConnect(EditReserveRoute);
